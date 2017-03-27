'use strict';

System.register(['app/core/config', 'app/core/app_events', 'app/plugins/sdk', 'lodash', 'moment'], function (_export, _context) {
  "use strict";

  var config, appEvents, PanelCtrl, _, moment, _createClass, InfluxAdminCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appCoreConfig) {
      config = _appCoreConfig.default;
    }, function (_appCoreApp_events) {
      appEvents = _appCoreApp_events.default;
    }, function (_appPluginsSdk) {
      PanelCtrl = _appPluginsSdk.PanelCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_moment) {
      moment = _moment.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      _export('PanelCtrl', InfluxAdminCtrl = function (_PanelCtrl) {
        _inherits(InfluxAdminCtrl, _PanelCtrl);

        function InfluxAdminCtrl($scope, $injector, $q, $rootScope, $timeout, $http) {
          _classCallCheck(this, InfluxAdminCtrl);

          var _this = _possibleConstructorReturn(this, (InfluxAdminCtrl.__proto__ || Object.getPrototypeOf(InfluxAdminCtrl)).call(this, $scope, $injector));

          _this.datasourceSrv = $injector.get('datasourceSrv');
          _this.injector = $injector;
          _this.q = $q;
          _this.$timeout = $timeout;
          _this.$http = $http;

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
          _this.events.on('refresh', _this.onRefresh.bind(_this));

          _this.writing = false;

          // defaults configs
          var defaults = {
            mode: 'current', // 'write', 'query'
            query: 'SHOW DIAGNOSTICS',
            updateEvery: 1200
          };
          _.defaults(_this.panel, defaults);

          // All influxdb datasources
          _this.dbs = [];
          _.forEach(config.datasources, function (val, key) {
            if ("influxdb" == val.type) {
              if (key == config.defaultDatasource) {
                _this.dbs.unshift(key);
              } else {
                _this.dbs.push(key);
              }
            }
          });

          // pick a datasource
          if (_.isNil(_this.panel.datasource)) {
            if (_this.dbs.length > 0) {
              _this.panel.datasource = _this.dbs[0];
            }
          }

          _this.queryInfo = {
            last: 0,
            count: 0,
            queries: []
          };

          if (_this.panel.updateEvery > 0) {
            _this.updateShowQueries();
          }
          return _this;
        }

        _createClass(InfluxAdminCtrl, [{
          key: 'isShowQueryWindow',
          value: function isShowQueryWindow() {
            return this.panel.mode == 'query';
          }
        }, {
          key: 'isShowCurrentQueries',
          value: function isShowCurrentQueries() {
            return this.panel.mode == 'current';
          }
        }, {
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/natel-influx-admin-panel/editor.html', 1);
            this.addEditorTab('Write Data', 'public/plugins/natel-influx-admin-panel/write.html', 2);
            this.editorTabIndex = 1;
          }
        }, {
          key: 'writeData',
          value: function writeData() {
            var _this2 = this;

            console.log("WRITE", this.writeDataText);
            this.writing = true;
            this.error = null;
            return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              _this2.$http({
                url: ds.urls[0] + '/write?db=' + ds.database,
                method: 'POST',
                data: _this2.writeDataText,
                headers: {
                  "Content-Type": "plain/text"
                }
              }).then(function (rsp) {
                _this2.writing = false;
                console.log("OK", rsp);
              }, function (err) {
                _this2.writing = false;
                console.log("ERROR", err);
                _this2.error = err.data.error + " [" + err.status + "]";
              });
            });
          }
        }, {
          key: 'askToKillQuery',
          value: function askToKillQuery(qinfo) {
            var _this3 = this;

            appEvents.emit('confirm-modal', {
              title: 'Kill Influx Query',
              text: 'Are you sure you want to kill this query?',
              text2: qinfo.query,
              icon: 'fa-trash',
              //confirmText: 'yes',
              yesText: 'Kill Query',
              onConfirm: function onConfirm() {
                _this3.datasourceSrv.get(_this3.panel.datasource).then(function (ds) {
                  ds._seriesQuery('kill query ' + qinfo.id).then(function (res) {
                    console.log('killed', qinfo, res);
                  });
                });
              }
            });
            return;
          }
        }, {
          key: 'updateShowQueries',
          value: function updateShowQueries() {
            var _this4 = this;

            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              _this4.db = ds;
              ds._seriesQuery('SHOW QUERIES').then(function (data) {
                var temp = [];
                _.forEach(data.results[0].series[0].values, function (res) {

                  // convert the time (string) to seconds (so that sort works!)
                  var durr = res[3];
                  var unit = durr[durr.length - 1];
                  var mag = 0;
                  if (unit == 's') {
                    mag = 1;
                  } else if (unit == 'm') {
                    mag = 60;
                  } else if (unit == 'h') {
                    mag = 60 * 60;
                  }
                  var secs = parseInt(durr.substring(0, durr.length - 1)) * mag;
                  if (secs == 0 && 'SHOW QUERIES' == res[1]) {
                    // Don't include the current query
                    _this4.queryInfo.lastId = res[0];
                  } else {
                    temp.push({
                      'secs': secs,
                      'time': res[3],
                      'query': res[1],
                      'db': res[2],
                      'id': res[0]
                    });
                  }
                });

                _this4.queryInfo.count++;
                _this4.queryInfo.last = Date.now();
                _this4.queryInfo.queries = temp;

                // Check if we should refresh the view
                if (_this4.isShowCurrentQueries() && _this4.panel.updateEvery > 0) {
                  _this4.queryInfo.timer = _this4.$timeout(function () {
                    _this4.updateShowQueries();
                  }, _this4.panel.updateEvery);
                }
              });
            });
          }
        }, {
          key: 'configChanged',
          value: function configChanged() {
            this.error = null;
            if (this.isShowCurrentQueries()) {
              this.updateShowQueries();
            } else {
              this.onSubmit();
            }
          }
        }, {
          key: 'getQueryTemplates',
          value: function getQueryTemplates() {
            return [{ text: 'Show Databases', click: "ctrl.panel.query = 'SHOW DATABASES'" }, { text: 'Create Database', click: "ctrl.panel.query = 'CREATE DATABASE &quot;db_name&quot;'" }, { text: 'Drop Database', click: "ctrl.panel.query = 'DROP DATABASE &quot;db_name&quot;'" }, { text: '--' }, { text: 'Show Measurements', click: "ctrl.panel.query = 'SHOW MEASUREMENTS'" }, { text: 'Show Field Keys', click: "ctrl.panel.query = 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;'" }, { text: 'Show Tag Keys', click: "ctrl.panel.query = 'SHOW TAG KEYS FROM &quot;measurement_name&quot;'" }, { text: 'Show Tag Values', click: "ctrl.panel.query = 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;'" }, { text: 'Drop Measurement', click: "ctrl.panel.query = 'DROP MEASUREMENT &quot;measurement_name&quot;'" }, { text: '--' }, { text: 'Show Retention Policies', click: "ctrl.panel.query = 'SHOW RETENTION POLICIES ON &quot;db_name&quot;'" }, { text: 'Create Retention Policy', click: "ctrl.panel.query = 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT'" }, { text: 'Drop Retention Policy', click: "ctrl.panel.query = 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;'" }, { text: '--' }, { text: 'Show Continuous Queries', click: "ctrl.panel.query = 'SHOW CONTINUOUS QUERIES'" }, { text: 'Create Continuous Query', click: "ctrl.panel.query = 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END'" }, { text: 'Drop Continuous Query', click: "ctrl.panel.query = 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;'" }, { text: '--' }, { text: 'Show Users', click: "ctrl.panel.query = 'SHOW USERS'" },
            //  { text: 'Create User',       click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD &apos;password&apos;" },
            //  { text: 'Create Admin User', click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES" },
            { text: 'Drop User', click: "ctrl.panel.query = 'DROP USER &quot;username&quot;'" }, { text: '--' }, { text: 'Show Stats', click: "ctrl.panel.query = 'SHOW STATS'" }, { text: 'Show Diagnostics', click: "ctrl.panel.query = 'SHOW DIAGNOSTICS'" }];
          }
        }, {
          key: 'isClickableQuery',
          value: function isClickableQuery() {
            if ("SHOW MEASUREMENTS" == this.panel.query) {
              return true;
            }
            if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
              return true;
            }
            return false;
          }
        }, {
          key: 'onClickedResult',
          value: function onClickedResult(res) {
            if ("SHOW MEASUREMENTS" == this.panel.query) {
              this.panel.query = 'SHOW FIELD KEYS FROM "' + res[0] + '"';
              this.onSubmit();
            } else if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
              var str = this.panel.query.split(/"/)[1];
              this.panel.query = 'SELECT "' + res[0] + '" FROM "' + str + '" ORDER BY time desc LIMIT 10';
              this.onSubmit();
            }
            return;
          }
        }, {
          key: 'onSubmit',
          value: function onSubmit() {
            var _this5 = this;

            var startTime = Date.now();
            this.error = null;
            this.runningQuery = true;
            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              //console.log( 'ds', ds, this.query);
              _this5.db = ds;
              ds._seriesQuery(_this5.panel.query).then(function (data) {
                // console.log("RSP", this.query, data);
                _this5.rsp = data;
                _this5.runningQuery = false;
                _this5.queryTime = (Date.now() - startTime) / 1000.0;
              }, function (err) {
                // console.log( 'ERROR with series query', err );
                _this5.runningQuery = false;
                _this5.error = err.message;
                _this5.queryTime = (Date.now() - startTime) / 1000.0;
              });
            });
          }
        }, {
          key: 'onPanelInitalized',
          value: function onPanelInitalized() {
            //console.log("onPanelInitalized()")
            this.onSubmit();
          }
        }, {
          key: 'onRender',
          value: function onRender() {
            //console.log("onRender");
          }
        }, {
          key: 'onRefresh',
          value: function onRefresh() {
            if (this.isShowCurrentQueries()) {
              this.updateShowQueries();
            }
            //console.log("onRefresh");
          }
        }]);

        return InfluxAdminCtrl;
      }(PanelCtrl));

      InfluxAdminCtrl.templateUrl = 'module.html';

      _export('PanelCtrl', InfluxAdminCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
