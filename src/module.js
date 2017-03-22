import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';


class InfluxAdminCtrl extends PanelCtrl {
  constructor($scope, $injector, $q, $rootScope, $timeout, $http) {
    super($scope, $injector);
    this.datasourceSrv = $injector.get('datasourceSrv');
    this.injector = $injector;
    this.q = $q;
    this.$timeout = $timeout;
    this.$http = $http;

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));

    this.writing = false;

    // defaults configs
    var defaults = {
      mode: 'current', // 'write', 'query'
      query: 'SHOW DIAGNOSTICS',
      updateEvery: 1200
    };
    _.defaults(this.panel, defaults);


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

    this.queryInfo = {
      last: 0,
      count: 0,
      queries: []
    };

    if(this.panel.updateEvery > 0) {
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
    this.addEditorTab('Options', 'public/plugins/natel-influx-admin-panel/editor.html',1);
    this.addEditorTab('Write Data', 'public/plugins/natel-influx-admin-panel/write.html',2);
    this.editorTabIndex = 1;
  }

  writeData() {
    console.log( "WRITE", this.writeDataText );
    this.writing = true;
    this.error = null;
    return this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      this.$http({
        url: ds.urls[0] + '/write?db=' + ds.database,
        method: 'POST',
        data: this.writeDataText,
        headers: {
          "Content-Type": "plain/text"
        }
      }).then((rsp) => {
        this.writing = false;
        console.log( "OK", rsp );
      }, err => {
        this.writing = false;
        console.log( "ERROR", err );
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
          ds._seriesQuery( 'kill query '+qinfo.id ).then( (res) => {
            console.log( 'killed', qinfo, res );
          });
        });
      }
    });
    return;
  }

  updateShowQueries() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      this.db = ds;
      ds._seriesQuery( 'SHOW QUERIES' ).then( (data) => {
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

  configChanged() {
    this.error = null;
    if( this.isShowCurrentQueries() ) {
      this.updateShowQueries();
    }
    else {
      this.onSubmit();
    }
  }

  getQueryTemplates() {
    return [
      { text: 'Show Databases',  click: "ctrl.panel.query = 'SHOW DATABASES'" },
      { text: 'Create Database', click: "ctrl.panel.query = 'CREATE DATABASE &quot;db_name&quot;'" },
      { text: 'Drop Database',   click: "ctrl.panel.query = 'DROP DATABASE &quot;db_name&quot;'" },
      { text: '--' },
      { text: 'Show Measurements', click: "ctrl.panel.query = 'SHOW MEASUREMENTS'" },
      { text: 'Show Field Keys',   click: "ctrl.panel.query = 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;'" },
      { text: 'Show Tag Keys',     click: "ctrl.panel.query = 'SHOW TAG KEYS FROM &quot;measurement_name&quot;'" },
      { text: 'Show Tag Values',   click: "ctrl.panel.query = 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;'" },
      { text: 'Drop Measurement',  click: "ctrl.panel.query = 'DROP MEASUREMENT &quot;measurement_name&quot;'" },
      { text: '--' },
      { text: 'Show Retention Policies', click: "ctrl.panel.query = 'SHOW RETENTION POLICIES ON &quot;db_name&quot;'" },
      { text: 'Create Retention Policy', click: "ctrl.panel.query = 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT'" },
      { text: 'Drop Retention Policy',   click: "ctrl.panel.query = 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;'" },
      { text: '--' },
      { text: 'Show Continuous Queries', click: "ctrl.panel.query = 'SHOW CONTINUOUS QUERIES'" },
      { text: 'Create Continuous Query', click: "ctrl.panel.query = 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END'" },
      { text: 'Drop Continuous Query',   click: "ctrl.panel.query = 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;'" },
      { text: '--' },
      { text: 'Show Users',        click: "ctrl.panel.query = 'SHOW USERS'" },
  //  { text: 'Create User',       click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD &apos;password&apos;" },
  //  { text: 'Create Admin User', click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES" },
      { text: 'Drop User',         click: "ctrl.panel.query = 'DROP USER &quot;username&quot;'" },
      { text: '--' },
      { text: 'Show Stats',       click: "ctrl.panel.query = 'SHOW STATS'" },
      { text: 'Show Diagnostics', click: "ctrl.panel.query = 'SHOW DIAGNOSTICS'" }
    ];
  }

  isClickableQuery() {
    if( "SHOW MEASUREMENTS" == this.panel.query) {
      return true;
    }
    if( this.panel.query.startsWith( 'SHOW FIELD KEYS FROM "')) {
      return true;
    }
    return false;
  }

  onClickedResult(res) {
    if( "SHOW MEASUREMENTS" == this.panel.query) {
      this.panel.query = 'SHOW FIELD KEYS FROM "' + res[0] +'"';
      this.onSubmit();
    }
    else if( this.panel.query.startsWith( 'SHOW FIELD KEYS FROM "')) {
      var str = this.panel.query.split(/"/)[1];
      this.panel.query = 'SELECT "' + res[0] +'" FROM "' + str +'" ORDER BY time desc LIMIT 10';
      this.onSubmit();
    }
    return;
  }

  onSubmit() {
    var startTime = Date.now();
    this.error = null;
    this.runningQuery = true;
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      //console.log( 'ds', ds, this.query);
      this.db = ds;
      ds._seriesQuery( this.panel.query ).then((data) => {
       // console.log("RSP", this.query, data);
        this.rsp = data;
        this.runningQuery = false;
        this.queryTime = (Date.now() - startTime) / 1000.0;
      }, (err) => {
       // console.log( 'ERROR with series query', err );
        this.runningQuery = false;
        this.error = err.message;
        this.queryTime = (Date.now() - startTime) / 1000.0;
      });
    });
  }

  onPanelInitalized() {
    //console.log("onPanelInitalized()")
    this.onSubmit();
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
InfluxAdminCtrl.templateUrl = 'module.html';

export {
  InfluxAdminCtrl as PanelCtrl
};


