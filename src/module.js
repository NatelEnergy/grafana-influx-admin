import config from 'app/core/config';
import appEvents from 'app/core/app_events';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';


class InfluxAdminCtrl extends PanelCtrl {
  constructor($scope, $injector, $q, $rootScope, $timeout) {
    super($scope, $injector);
    this.datasourceSrv = $injector.get('datasourceSrv');
    this.injector = $injector;
    this.q = $q;
    this.query = "SHOW DIAGNOSTICS";
    this.$timeout = $timeout;

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
  

    // defaults configs
    var defaults = {
      mode: 'current', // 'write', 'query'
      updateEvery: 1100
    };
    this.panel = $.extend(true, defaults, this.panel );
    
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


  onInitEditMode() {
    this.addEditorTab('Options', 'public/plugins/natel-influx-admin/editor.html',1);
    this.editorTabIndex = 1;
  }

  setQuery(q) {
    this.query = q;

    console.log("Set Query: ", q)
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
    return this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      return ds._seriesQuery( 'SHOW QUERIES' ).then((data) => {
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

          temp.push( {
            'secs': secs,
            'time': res[3],
            'query': res[1],
            'db': res[2],
            'id': res[0]
          });
        });

        this.queryInfo.count++;
        this.queryInfo.last = Date.now();
        this.queryInfo.queries = temp;
        console.log("QUERIES", this.currentQueries);

        // Check if we should refresh the view
        if( 'current' == this.panel.mode && this.panel.updateEvery>0 ) {
          this.queryInfo.timer = this.$timeout( () => {
            this.updateShowQueries()
          }, this.panel.updateEvery);
        }
        return Promise.resolve(temp);
      });
    });
  }

  modeChanged() {
    if('current' == this.panel.mode) {
      this.updateShowQueries();
    }
    this.render();
  }

  getQueryTemplates() {
    return [
      { text: 'Show Databases', click: "ctrl.setQuery('SHOW DATABASES')" },
      { text: 'Create Database', click: "ctrl.setQuery('CREATE DATABASE &quot;db_name&quot;')" },
      { text: 'Drop Database', click: "ctrl.setQuery('DROP DATABASE &quot;db_name&quot;')" },
      { text: '--' },
      { text: 'Show Measurements', click: "ctrl.setQuery('SHOW MEASUREMENTS')" },
      { text: 'Show Tag Keys', click: "ctrl.setQuery('SHOW TAG KEYS FROM &quot;measurement_name&quot;')" },
      { text: 'Show Tag Values', click: "ctrl.setQuery('SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;')" },
      { text: '--' },
      { text: 'Show Retention Policies', click: "ctrl.setQuery('SHOW RETENTION POLICIES ON &quot;db_name&quot;')" },
      { text: 'Create Retention Policy', click: "ctrl.setQuery('CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT')" },
      { text: 'Drop Retention Policy', click: "ctrl.setQuery('DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;')" },
      { text: '--' },
      { text: 'Show Continuous Queries', click: "ctrl.setQuery('SHOW CONTINUOUS QUERIES')" },
      { text: 'Create Continuous Query', click: "ctrl.setQuery('CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END')" },
      { text: 'Drop Continuous Query', click: "ctrl.setQuery('DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;')" },
      { text: '--' },
      { text: 'Show Users', click: "ctrl.setQuery('SHOW USERS')" },
      { text: 'Create User', click: "ctrl.setQuery('CREATE USER &quot;username&quot; WITH PASSWORD 'password'')" },
      { text: 'Create Admin User', click: "ctrl.setQuery('CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES')" },
      { text: 'Drop User', click: "ctrl.setQuery('DROP USER &quot;username&quot;')" },
      { text: '--' },
      { text: 'Show Stats', click: "ctrl.setQuery('SHOW STATS')" },
      { text: 'Show Diagnostics', click: "ctrl.setQuery('SHOW DIAGNOSTICS')" }
    ];
  }

  onSubmit() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      console.log( 'ds', ds, this.query);
      ds._seriesQuery( this.query ).then((data) => {
        console.log("RSP", this.query, data);
        this.rsp = data;
      });
    });
  }

  onPanelInitalized() {
    console.log("onPanelInitalized()")
  }

  onRender() {
    console.log("onRender");
  }

  onRefresh() {
    if( 'current' == this.panel.mode ) {
      this.updateShowQueries();
    }
    console.log("onRefresh");
  }
}
InfluxAdminCtrl.templateUrl = 'module.html';

export {
  InfluxAdminCtrl as PanelCtrl
};


