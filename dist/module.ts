///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {MetricsPanelCtrl} from 'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';

class InfluxAdminCtrl extends MetricsPanelCtrl {
  static templateUrl = 'partials/module.html';
  static scrollable = true;

  writing: boolean;
  history: Array<any>;
  dbSeg: any;
  ds: any;

  // The running Queries
  queryInfo: any;
  queryRefresh: any; // $timeout promice

  // Helpers for the html
  clickableQuery: boolean;
  rsp: any; // the raw response from InfluxDB
  rspInfo: string;

  // This is set in the form
  writeDataText: string;
  q: string;

  defaults = {
    mode: 'current', // 'write', 'query'
    query: 'SHOW DIAGNOSTICS',
    database: null,
    time: 'YYYY-MM-DDTHH:mm:ssZ',
    refresh: false,
    refreshInterval: 1200,
    allowDatabaseQuery: true,
  };

  /** @ngInject **/
  constructor($scope, $injector, private $http, private uiSegmentSrv) {
    super($scope, $injector);

    console.log('INFLUX', config);

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));

    this.writing = false;
    this.history = [];

    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);

    var txt = this.panel.database;
    if (_.isNil(txt)) {
      txt = '(default)';
    }
    this.dbSeg = this.uiSegmentSrv.newSegment(txt);
    this.queryInfo = {
      last: 0,
      count: 0,
      queries: [],
    };
  }

  onPanelInitalized() {
    if (_.isNil(this.panel.datasource)) {
      this.getDatasources().then(dss => {
        if (_.size(dss) > 0) {
          this.datasourceChanged(dss[0]);
        }
      });
    }
  }

  isShowQueryWindow() {
    return this.panel.mode == 'query';
  }

  isShowCurrentQueries() {
    return this.panel.mode == 'current';
  }

  // This gets called at each 'refresh'
  issueQueries(datasource) {
    if (this.isShowCurrentQueries()) {
      this.updateShowQueries();
    } else {
      if (!this.isPostQuery()) {
        this.doSubmit();
      }
    }

    // Return empty results
    return null; //this.$q.when( [] );
  }

  // Overrides the default handling
  handleQueryResult(result) {
    // ignore the nullconsole.log('handleQueryResult', result);
  }

  onInitEditMode() {
    this.editorTabs.splice(1, 1); // remove the 'Metrics Tab'
    this.addEditorTab(
      'Options',
      'public/plugins/natel-influx-admin-panel/partials/editor.html',
      1
    );
    this.addEditorTab(
      'Write Data',
      'public/plugins/natel-influx-admin-panel/partials/write.html',
      2
    );
    this.editorTabIndex = 1;
  }

  writeData() {
    console.log('WRITE', this.writeDataText);
    this.writing = true;
    this.error = null;
    this.inspector = null;
    return this.datasourceSrv.get(this.panel.datasource).then(ds => {
      var db = ds.database;
      if (!_.isNil(this.panel.database) && this.panel.allowDatabaseQuery) {
        db = ds.database;
      }
      this.$http({
        url: ds.urls[0] + '/write?db=' + db,
        method: 'POST',
        data: this.writeDataText,
        headers: {
          'Content-Type': 'plain/text',
        },
      }).then(
        rsp => {
          this.writing = false;
          console.log('Wrote OK', rsp.headers());
        },
        err => {
          this.writing = false;
          console.log('Wite ERROR', err);
          this.error = err.data.error + ' [' + err.status + ']';
          this.inspector = {error: err};
        }
      );
    });
  }

  askToKillQuery(qinfo) {
    appEvents.emit('confirm-modal', {
      title: 'Kill Influx Query',
      text: 'Are you sure you want to kill this query?',
      text2: qinfo.query,
      icon: 'fa-trash',
      //confirmText: 'yes',
      yesText: 'Kill Query',
      onConfirm: () => {
        this.datasourceSrv.get(this.panel.datasource).then(ds => {
          ds._seriesQuery('kill query ' + qinfo.id).then(res => {
            console.log('killed', qinfo, res);
          });
        });
      },
    });
    return;
  }

  getSecondsFromString(durr: string): Number {
    let secs = 0;
    let parts = durr.match(/(\d*\D*)/g);

    _.each(parts, p => {
      if (p.length > 1) {
        let idx = p.length - 1;
        let unit = p[idx];
        let mag = 1;
        if (unit == 's') {
          // could be 39µs
          if (p[p.length - 2] == 'µ') {
            mag = 0.001;
            idx -= 1;
          }
        } else if (unit == 'm') {
          mag = 60;
        } else if (unit == 'h') {
          mag = 60 * 60;
        }
        secs += parseInt(p.substring(0, idx)) * mag;
      }
    });
    return secs;
  }

  private setErrorIfInvalid(ds): boolean {
    if (ds == null) {
      if (_.isNil(this.panel.datasource)) {
        this.reportError('ds', 'No datasource configured');
      } else {
        this.reportError('ds', 'Can not find datasource: ' + this.panel.datasource);
      }
      return true;
    }
    if ('influxdb' === ds.type) {
      return false;
    }
    this.reportError('ds', 'Configure an influx database: ' + ds.name + ' / ' + ds.type);
    console.log('Invalid Datasource', ds);
    return true;
  }

  private updateShowQueries() {
    // Cancel any pending calls
    this.$timeout.cancel(this.queryRefresh);

    // Don't query when other things are fullscreen
    if (this.otherPanelInFullscreenMode()) {
      return;
    }

    this.datasourceSrv.get(this.panel.datasource).then(ds => {
      this.ds = ds;
      if (this.setErrorIfInvalid(ds)) {
        return;
      }

      this.loading = true;
      this.error = null;

      ds
        ._seriesQuery('SHOW QUERIES', this.panel.options)
        .then(data => {
          var temp = [];
          let values = data.results[0].series[0].values;
          if (values.length == 1 && values[0][1] === 'SHOW QUERIES') {
            // this is the query we sent!
          } else {
            _.forEach(values, res => {
              // convert the time (string) to seconds (so that sort works!)
              let secs = this.getSecondsFromString(res[3]);
              var status = '';
              if (res.length > 3 && res[4] !== 'running') {
                status = res[4];
              }
              temp.push({
                secs: secs,
                time: res[3],
                query: res[1],
                db: res[2],
                id: res[0],
                status: status,
              });
            });
          }

          this.queryInfo.count++;
          this.queryInfo.last = moment(Date.now());
          this.queryInfo.queries = temp;
          this.$timeout.cancel(this.queryRefresh);
          this.loading = false;
          this.$timeout(() => {
            this.renderingCompleted();
          }, 100);

          // Check if we should refresh the view
          if (
            this.isShowCurrentQueries() &&
            this.panel.refresh &&
            this.panel.refreshInterval > 0
          ) {
            this.queryRefresh = this.$timeout(() => {
              this.updateShowQueries();
            }, this.panel.refreshInterval);
          }
        })
        .catch(err => {
          this.reportError('Show Queries', err);
        });
    });
  }

  dbChanged() {
    this.datasourceSrv.get(this.panel.datasource).then(ds => {
      this.ds = ds;
      let db = this.dbSeg.value;
      if (db === ds.database || db.startsWith('(')) {
        this.panel.database = null;
      } else {
        this.panel.database = db;
      }
      console.log('DB Changed!', this.dbSeg, this.panel.database);
      this.configChanged();
    });
  }

  configChanged() {
    this.error = null;
    if (this.isShowCurrentQueries()) {
      this.updateShowQueries();
    } else {
      this.onQueryChanged();
    }
  }

  // This seems to be required to get the dropdown to be properly initalized
  private initEditorDS() {
    this.getDatasources().then(dss => {
      _.forEach(dss, ds => {
        if (ds.name == this.panel.datasource) {
          this.datasourceChanged(ds);
          return false;
        }
      });
    });
  }

  // Return only the influx databases.  Even the ones from template varables
  private getDatasources() {
    return Promise.resolve(
      this.datasourceSrv
        .getMetricSources()
        .filter(value => {
          if (value.meta.baseUrl.endsWith('/influxdb')) {
            return true;
          }
          return false;
        })
        .map(ds => {
          return {value: ds.value, text: ds.name, datasource: ds};
        })
    );
  }

  private datasourceChanged(opt) {
    console.log('Set Datasource: ', opt);
    this.panel.datasource = opt.value;
    this.setDatasource(opt.datasource);
  }

  private getDBsegs() {
    return this.datasourceSrv.get(this.panel.datasource).then(ds => {
      return ds
        .metricFindQuery('SHOW DATABASES')
        .then(data => {
          var segs = [this.uiSegmentSrv.newSegment('(' + ds.database + ')')];
          _.forEach(data, val => {
            segs.push(this.uiSegmentSrv.newSegment(val.text));
          });
          return segs;
        })
        .catch(err => {
          console.log('DBSegs error???', err);
        });
    });
  }

  getQueryHistory() {
    return this.history;
  }

  commonQueries = {
    cPd:
      'SELECT numSeries FROM "_internal".."database" WHERE time > now() - 10s GROUP BY "database" ORDER BY desc LIMIT 1',
    cAd:
      'SELECT sum(numSeries) AS "total_series" FROM "_internal".."database" WHERE time > now() - 10s',
    createuser: 'CREATE USER "jdoe" WITH PASSWORD \'1337password\'',
    createadmin: 'CREATE USER "jdoe" WITH PASSWORD \'1337password\' WITH ALL PRIVILEGES',
  };

  getQueryTemplates() {
    return [
      {text: 'Show Databases', click: "ctrl.setQuery( 'SHOW DATABASES' );"},
      {
        text: 'Create Database',
        click: "ctrl.setQuery( 'CREATE DATABASE &quot;db_name&quot;' );",
      },
      {
        text: 'Drop Database',
        click: "ctrl.setQuery( 'DROP DATABASE &quot;db_name&quot;' );",
      },
      {text: '--'},
      {text: 'Show Measurements', click: "ctrl.setQuery( 'SHOW MEASUREMENTS' );"},
      {
        text: 'Show Field Keys',
        click: "ctrl.setQuery( 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;' );",
      },
      {
        text: 'Show Tag Keys',
        click: "ctrl.setQuery( 'SHOW TAG KEYS FROM &quot;measurement_name&quot;' );",
      },
      {
        text: 'Show Tag Values',
        click:
          "ctrl.setQuery( 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;' );",
      },
      {
        text: 'Drop Measurement',
        click: "ctrl.setQuery( 'DROP MEASUREMENT &quot;measurement_name&quot;' );",
      },
      {text: '--'},
      {
        text: 'Show Retention Policies',
        click: "ctrl.setQuery( 'SHOW RETENTION POLICIES ON &quot;db_name&quot;' );",
      },
      {
        text: 'Create Retention Policy',
        click:
          "ctrl.setQuery( 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT' );",
      },
      {
        text: 'Drop Retention Policy',
        click:
          "ctrl.setQuery( 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;' );",
      },
      {text: '--'},
      {
        text: 'Show Continuous Queries',
        click: "ctrl.setQuery( 'SHOW CONTINUOUS QUERIES' );",
      },
      {
        text: 'Create Continuous Query',
        click:
          "ctrl.setQuery( 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END' );",
      },
      {
        text: 'Drop Continuous Query',
        click:
          "ctrl.setQuery( 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;' );",
      },
      {text: '--'},
      {text: 'Show Users', click: "ctrl.setQuery( 'SHOW USERS' );"},
      {text: 'Create User', click: 'ctrl.setQuery( ctrl.commonQueries.createuser );'},
      {
        text: 'Create Admin User',
        click: 'ctrl.setQuery( ctrl.commonQueries.createadmin );',
      },
      {text: 'Drop User', click: "ctrl.setQuery( 'DROP USER &quot;username&quot;' );"},
      {text: '--'},
      {text: 'Series cardinality', click: 'ctrl.setQuery( ctrl.commonQueries.cPd );'},
      {
        text: 'Series cardinality (all)',
        click: 'ctrl.setQuery( ctrl.commonQueries.cAd );',
      },
      {text: 'Show Stats', click: "ctrl.setQuery( 'SHOW STATS' );"},
      {text: 'Show Diagnostics', click: "ctrl.setQuery( 'SHOW DIAGNOSTICS' );"},
    ];
  }

  setQuery(txt) {
    this.panel.query = txt;
    this.onQueryChanged();
  }

  isClickableQuery() {
    let q = this.q;
    if (q && q.startsWith('SHOW ')) {
      if ('SHOW DATABASES' == q && this.panel.queryDB) {
        return true;
      }
      if (q.startsWith('SHOW MEASUREMENTS')) {
        return true;
      }
      if (q.startsWith('SHOW FIELD KEYS')) {
        return true;
      }
    }
    return false;
  }

  onClickedResult(res) {
    console.log('CLICKED', this.panel.query, res);

    if ('SHOW DATABASES' == this.panel.query && this.panel.queryDB) {
      this.panel.query = 'SHOW MEASUREMENTS';
      this.dbSeg = this.uiSegmentSrv.newSegment(res);
      this.dbChanged();
    } else if ('SHOW MEASUREMENTS' == this.panel.query) {
      this.setQuery('SHOW FIELD KEYS FROM "' + res + '"');
    } else if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
      var str = this.panel.query.split(/"/)[1];
      this.setQuery('SELECT "' + res + '" FROM "' + str + '" WHERE $timeFilter LIMIT 10');
    }
    return;
  }

  isPostQuery() {
    var q = this.panel.query;
    return !(q.startsWith('SELECT ') || q.startsWith('SHOW '));
  }

  onQueryChanged() {
    console.log('onQueryChanged()', this.panel.query);
    this.rsp = null;
    if (!this.isPostQuery()) {
      this.doSubmit();
    } else {
      console.log("POST query won't submit automatically");
    }
  }

  doSubmit() {
    let q = this.panel.query;
    this.history.unshift({text: q, value: q}); // Keep the template variables
    for (let i = 1; i < this.history.length; i++) {
      if (this.history[i].value === q) {
        this.history.splice(i, 1);
        break;
      }
    }
    if (this.history.length > 15) {
      this.history.pop();
    }

    var startTime = Date.now();
    this.error = null;
    this.inspector = null;
    this.clickableQuery = false;
    this.datasourceSrv
      .get(this.panel.datasource)
      .then(ds => {
        this.ds = ds;
        if (this.setErrorIfInvalid(ds)) {
          return;
        }

        let timeFilter = ds.getTimeFilter({rangeRaw: this.range.raw});
        let scopedVars = this.panel.scopedVars;
        if (!scopedVars) {
          scopedVars = {};
        }
        scopedVars.timeFilter = {value: timeFilter};

        this.q = this.templateSrv.replace(q, scopedVars);

        var opts: any = {};
        if (this.panel.allowDatabaseQuery && this.panel.database) {
          opts.database = this.panel.database;
        }
        if (this.isPostQuery()) {
          opts.method = 'POST';
          console.log('TODO, change the request to a POST query: ', opts);
        }

        this.loading = true;
        this.rspInfo = '...';

        ds
          ._seriesQuery(this.q, opts)
          .then(data => {
            this.loading = false;
            this.clickableQuery = this.isClickableQuery();
            var rowCount = 0;
            var seriesCount = 0;
            var queryTime = (Date.now() - startTime) / 1000.0;

            // Process the timestamps
            _.forEach(data.results, query => {
              _.forEach(query, res => {
                if (_.isArray(res)) {
                  _.forEach(res, series => {
                    if (series.columns && series.columns[0] == 'time') {
                      _.forEach(series.values, row => {
                        row[0] = moment(row[0]).format(this.panel.time);
                      });
                    }
                    if (series.values) {
                      rowCount += series.values.length;

                      if (series.values.length == 1 && !this.clickableQuery) {
                        // Show rows as columns (SHOW DIAGNOSTICS)
                        series.rowsAsCols = [];
                        _.forEach(series.columns, (col, idx) => {
                          let xform = [col];
                          _.forEach(series.values, row => {
                            xform.push(row[idx]);
                          });
                          series.rowsAsCols.push(xform);
                        });
                      }
                    }
                    seriesCount++;
                  });
                }
              });
            });
            // Set this after procesing the timestamps
            this.rsp = data;
            if (seriesCount > 0) {
              this.rspInfo =
                seriesCount + ' series, ' + rowCount + ' values, in ' + queryTime + 's';
            } else {
              this.rspInfo = 'No Results in ' + queryTime + 's';
            }
            this.$timeout(() => {
              this.renderingCompleted();
            }, 100);
          })
          .catch(err => {
            var queryTime = (Date.now() - startTime) / 1000.0;
            this.rspInfo = 'Query in ' + queryTime + 's';
            this.reportError('ds._seriesQuery', err);
            this.renderingCompleted();
          });
      })
      .catch(err => {
        var queryTime = (Date.now() - startTime) / 1000.0;
        this.rspInfo = 'Error in ' + queryTime + 's';
        this.reportError('get DS', err);
      });
  }

  private reportError(src: string, err: any) {
    console.log('Error', src, err);
    this.loading = false;
    this.clickableQuery = false;
    if (err.data) {
      this.error = err.data.message;
      this.inspector = {error: err};
      this.rsp = err.data;
    } else if (err.message) {
      this.error = err.message;
    } else {
      this.error = err;
    }
  }
}

export {InfluxAdminCtrl as PanelCtrl};
