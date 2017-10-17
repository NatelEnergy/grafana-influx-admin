///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />

import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';


class InfluxAdminCtrl extends PanelCtrl {
  static templateUrl = 'partials/module.html';

  datasourceSrv: any;
  uiSegmentSrv: any;
  templateSrv: any;
  $http: any;
  writing: boolean;
  history: Array<any>;
  dbs: Array<string>;
  dbSeg: any;
  queryInfo: any;

  // Helpers for the html
  clickableQuery: boolean;
  runningQuery: boolean;
  queryTime: Number;
  rsp: any; // the raw response from InfluxDB

  // This is set in the form
  writeDataText: string;
  q: string;

  defaults = {
    mode: 'current', // 'write', 'query'
    query: 'SHOW DIAGNOSTICS',
    options: {
      database: null
    },
    time: 'YYYY-MM-DDTHH:mm:ssZ',
    updateEvery: 1200
  };

  /** @ngInject **/
  constructor($scope, $injector, templateSrv, $rootScope, $http, uiSegmentSrv) {
    super($scope, $injector);

    this.datasourceSrv = $injector.get('datasourceSrv');
    this.uiSegmentSrv = uiSegmentSrv;
    this.$http = $http;
    this.templateSrv = templateSrv;

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));

    this.writing = false;
    this.history = [  ];


    // defaults configs
    _.defaultsDeep(this.panel, this.defaults);


    // All influxdb datasources
    this.dbs = [];
    _.forEach(config.datasources, (val, key) => {
      if ("influxdb" == val.type) {
        if(key == config.defaultDatasource) {
          this.dbs.unshift(key);
        }
        else {
          this.dbs.push(key);
        }
      }
    });

    // pick a datasource
    if( _.isNil( this.panel.datasource ) ) {
      if(this.dbs.length > 0) {
        this.panel.datasource = this.dbs[0];
      }
    }
    var txt = "default";
    if(this.panel.options.database) {
      txt = this.panel.options.database;
    }
    this.dbSeg = this.uiSegmentSrv.newSegment(txt);

    this.queryInfo = {
      last: 0,
      count: 0,
      queries: []
    };

    if(this.isShowCurrentQueries() && this.panel.updateEvery > 0) {
      this.updateShowQueries();
    }
  }


  isShowQueryWindow() {
    return this.panel.mode == 'query';
  }

  isShowCurrentQueries() {
    return this.panel.mode == 'current';
  }

  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/natel-influx-admin-panel/partials/editor.html',1);
    this.addEditorTab('Write Data', 'public/plugins/natel-influx-admin-panel/partials/write.html',2);
    this.editorTabIndex = 1;
  }

  writeData() {
    console.log( "WRITE", this.writeDataText );
    this.writing = true;
    this.error = null;
    return this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      var db = this.panel.options.database;
      if(_.isNil(db)) {
        db = ds.database;
      }
      this.$http({
        url: ds.urls[0] + '/write?db=' + db,
        method: 'POST',
        data: this.writeDataText,
        headers: {
          "Content-Type": "plain/text"
        }
      }).then((rsp) => {
        this.writing = false;
        console.log( "Wrote OK", rsp );
      }, err => {
        this.writing = false;
        console.log( "Wite ERROR", err );
        this.error = err.data.error + " ["+err.status+"]";
      });
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
        this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
          ds._seriesQuery( 'kill query '+qinfo.id, this.panel.options ).then( (res) => {
            console.log( 'killed', qinfo, res );
          });
        });
      }
    });
    return;
  }

  updateShowQueries() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      ds._seriesQuery( 'SHOW QUERIES', this.panel.options ).then( (data) => {
        var temp = [];
        _.forEach(data.results[0].series[0].values, (res) => {

          // convert the time (string) to seconds (so that sort works!)
          let durr = res[3];
          let unit = durr[durr.length - 1];
          let mag = 0;
          if(unit=='s') {
            mag = 1;
          }
          else if(unit=='m') {
            mag = 60;
          }
          else if(unit=='h') {
            mag = 60*60;
          }
          let secs = parseInt( durr.substring(0,durr.length-1)) * mag;
          if(secs == 0 && 'SHOW QUERIES' == res[1]) {
            // Don't include the current query
            this.queryInfo.lastId = res[0];
          }
          else {
            temp.push( {
              'secs': secs,
              'time': res[3],
              'query': res[1],
              'db': res[2],
              'id': res[0]
            });
          }
        });

        this.queryInfo.count++;
        this.queryInfo.last = Date.now();
        this.queryInfo.queries = temp;

        // Check if we should refresh the view
        if( this.isShowCurrentQueries() && this.panel.updateEvery>0 ) {
          this.queryInfo.timer = this.$timeout( () => {
            this.updateShowQueries()
          }, this.panel.updateEvery);
        }
      });
    });
  }

  dbChanged() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      console.log( "DB Changed", this.dbSeg );
      let db = this.dbSeg.value;
      if(db === ds.database || db === "default") {
        this.panel.options.database = null;
      }
      else {
        this.panel.options.database = db;
      }
      this.configChanged();
    });
  }

  configChanged() {
    this.error = null;
    if( this.isShowCurrentQueries() ) {
      this.updateShowQueries();
    }
    else {
      this.onQueryChanged();
    }
  }

  getDBsegs() {
    return this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      return ds.metricFindQuery( "SHOW DATABASES", this.panel.options ).then((data) => {
        var segs = [];
        _.forEach(data, (val) => {
          segs.push( this.uiSegmentSrv.newSegment( val.text ) );
        });
        return segs;
      }, (err) => {
        console.log( "TODO... error???", err);
      });
    });
  }

  getQueryHistory() {
    return this.history;
  }

  getQueryTemplates() {
    return [
      { text: 'Show Databases',  click: "ctrl.setQuery( 'SHOW DATABASES' );" },
      { text: 'Create Database', click: "ctrl.setQuery( 'CREATE DATABASE &quot;db_name&quot;' );" },
      { text: 'Drop Database',   click: "ctrl.setQuery( 'DROP DATABASE &quot;db_name&quot;' );" },
      { text: '--' },
      { text: 'Show Measurements', click: "ctrl.setQuery( 'SHOW MEASUREMENTS' );" },
      { text: 'Show Field Keys',   click: "ctrl.setQuery( 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;' );" },
      { text: 'Show Tag Keys',     click: "ctrl.setQuery( 'SHOW TAG KEYS FROM &quot;measurement_name&quot;' );" },
      { text: 'Show Tag Values',   click: "ctrl.setQuery( 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;' );" },
      { text: 'Drop Measurement',  click: "ctrl.setQuery( 'DROP MEASUREMENT &quot;measurement_name&quot;' );" },
      { text: '--' },
      { text: 'Show Retention Policies', click: "ctrl.setQuery( 'SHOW RETENTION POLICIES ON &quot;db_name&quot;' );" },
      { text: 'Create Retention Policy', click: "ctrl.setQuery( 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT' );" },
      { text: 'Drop Retention Policy',   click: "ctrl.setQuery( 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;' );" },
      { text: '--' },
      { text: 'Show Continuous Queries', click: "ctrl.setQuery( 'SHOW CONTINUOUS QUERIES' );" },
      { text: 'Create Continuous Query', click: "ctrl.setQuery( 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END' );" },
      { text: 'Drop Continuous Query',   click: "ctrl.setQuery( 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;' );" },
      { text: '--' },
      { text: 'Show Users',        click: "ctrl.setQuery( 'SHOW USERS' );" },
  //  { text: 'Create User',       click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD &apos;password&apos;" },
  //  { text: 'Create Admin User', click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES" },
      { text: 'Drop User',         click: "ctrl.setQuery( 'DROP USER &quot;username&quot;' );" },
      { text: '--' },
      { text: 'Show Stats',       click: "ctrl.setQuery( 'SHOW STATS' );" },
      { text: 'Show Diagnostics', click: "ctrl.setQuery( 'SHOW DIAGNOSTICS' );" }
    ];
  }

  setQuery(txt) {
    this.panel.query = txt;
    this.onQueryChanged();
  }

  isClickableQuery() {
    if( "SHOW DATABASES" == this.panel.query) {
      return true;
    }
    if( "SHOW MEASUREMENTS" == this.panel.query) {
      return true;
    }
    if( this.panel.query.startsWith( 'SHOW FIELD KEYS FROM "')) {
      return true;
    }
    return false;
  }

  onClickedResult(res) {
    console.log( "CLICKED", this.panel.query, res );

    if( "SHOW DATABASES" == this.panel.query) {
      this.panel.query = 'SHOW MEASUREMENTS';
      this.dbSeg = this.uiSegmentSrv.newSegment( res[0] );
      this.dbChanged();
    }
    else if( "SHOW MEASUREMENTS" == this.panel.query) {
      this.setQuery( 'SHOW FIELD KEYS FROM "' + res[0] +'"' );
    }
    else if( this.panel.query.startsWith( 'SHOW FIELD KEYS FROM "')) {
      var str = this.panel.query.split(/"/)[1];
      this.setQuery( 'SELECT "' + res[0] +'" FROM "' + str +'" ORDER BY time desc LIMIT 10' );
    }
    return;
  }

  isPostQuery() {
    var q = this.panel.query;
    return !(
      q.startsWith( "SELECT " ) ||
      q.startsWith( "SHOW " ));
  }

  onQueryChanged() {
    console.log("onQueryChanged()", this.panel.query );
    this.rsp = null;
    if(!this.isPostQuery()) {
      this.doSubmit();
    }
    else {
      console.log("POST query won't submit automatically");
    }
  }

  doSubmit() {
    let q = this.panel.query;
    this.history.unshift( { text:q, value: q} ); // Keep the template variables
    for(let i=1; i<this.history.length; i++) {
      if(this.history[i].value === q) {
        this.history.splice(i,1);
        break;
      }
    }
    if(this.history.length > 15) {
      this.history.pop();
    }

    this.q = this.templateSrv.replace(q, this.panel.scopedVars);
    console.log("doSubmit()", this.q );


    var startTime = Date.now();
    this.error = null;
    this.clickableQuery = false;
    this.runningQuery = true;
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      //console.log( 'doSubmit >>>', ds, this.panel.query, this.panel.options);
      ds._seriesQuery( this.q, this.panel.options ).then((data) => {
        this.runningQuery = false;
        this.queryTime = (Date.now() - startTime) / 1000.0;
        this.clickableQuery = this.isClickableQuery();

        // Process the timestamps
        _.forEach(data.results, (query) => {
          _.forEach(query, (res) => {
            _.forEach(res, (series) => {
              if( series.columns && series.columns[0] == 'time') {
                _.forEach(series.values, (row) => {
                  row[0] = moment(row[0]).format( this.panel.time );
                });
              }
            });
          });
        });
        // Set this after procesing the timestamps
        this.rsp = data;

      }, (err) => {
       // console.log( 'ERROR with series query', err );
        this.runningQuery = false;
        this.clickableQuery = false;
        this.error = err.message;
        this.queryTime = (Date.now() - startTime) / 1000.0;
      });
    });
  }

  onPanelInitalized() {
    //console.log("onPanelInitalized()")
    this.onQueryChanged();
  }

  onRender() {
    //console.log("onRender");
  }

  onRefresh() {
    if( this.isShowCurrentQueries() ) {
      this.updateShowQueries();
    }
    //console.log("onRefresh");
  }
}

export {
  InfluxAdminCtrl as PanelCtrl
};


