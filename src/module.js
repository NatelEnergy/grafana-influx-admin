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

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
  
    
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
      confirmText: 'yes',
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

  onSubmit() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      console.log( 'ds', ds, this.query);
      ds._seriesQuery( this.query ).then((data) => {
        console.log("RSP", this.query, data);
        this.rsp = data;
      });

      ds._seriesQuery( 'SHOW QUERIES' ).then((data) => {

        this.currentQueries = [];
        // convert the time (string) to seconds
        _.forEach(data.results[0].series[0].values, (res) => {
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

          this.currentQueries.push( {
            'secs': secs,
            'query': res[1],
            'db': res[2],
            'id': res[0]
          });
        });

        console.log("QUERIES", this.currentQueries);
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
    console.log("onRefresh");
  }
}
InfluxAdminCtrl.templateUrl = 'module.html';

export {
  InfluxAdminCtrl as PanelCtrl
};


