import config from 'app/core/config';

import {PanelCtrl} from  'app/plugins/sdk';

import _ from 'lodash';
import moment from 'moment';


class InfluxAdminCtrl extends PanelCtrl {
  constructor($scope, $injector, $q, $rootScope, $timeout) {
    super($scope, $injector);
    this.datasourceSrv = $injector.get('datasourceSrv');
    this.injector = $injector;
    this.q = $q;
    this.scope = $scope;
    this.scope.query = "SHOW DIAGNOSTICS";

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
    this.events.on('refresh', this.onRefresh.bind(this));
  
    this.db = null;
    this.dbs = [];
    _.forEach(config.datasources, (val, key) => {
      if ("influxdb" == val.type) {
        this.dbs.push(key);

        if(key == config.defaultDatasource) {
          this.db = key;
        }
      }
    });
    if(this.db == null) {
      this.db = this.dbs[0];
    }
    console.log("CFG", this.db, this.dbs);

    this.onSubmit();
  }


  onInitEditMode() {
    this.controllers = [];
    _.forEach( config.datasources, (val,key) => {
      if( "natel-controls" == val.type ) {
        this.controllers.push( key );
      }
    });

    // TODO, hide the normal metrics panel
    this.editorTabs.splice(1,1); // remove the 'Metrics Tab'
    this.addEditorTab('Options', 'public/plugins/natel-influx-admin/editor.html',1);
    this.editorTabIndex = 1;

    this.onQueryChanged();
  }

  setQuery(q) {
    this.scope.query = q;

    console.log("Set Query: ", q)
  }

  onSubmit() {
    this.datasourceSrv.get(this.panel.datasource).then( (ds) => {
      console.log( 'ds');
      ds._seriesQuery( this.scope.query ).then((data) => {
        console.log("RSP", data);
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
    console.log("onRefresh");
  }
}
InfluxAdminCtrl.templateUrl = 'module.html';

export {
  InfluxAdminCtrl as PanelCtrl
};


