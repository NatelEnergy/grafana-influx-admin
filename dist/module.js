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

        function InfluxAdminCtrl($scope, $injector, $q, $rootScope, $timeout, $http, uiSegmentSrv) {
          _classCallCheck(this, InfluxAdminCtrl);

          var _this = _possibleConstructorReturn(this, (InfluxAdminCtrl.__proto__ || Object.getPrototypeOf(InfluxAdminCtrl)).call(this, $scope, $injector));

          _this.datasourceSrv = $injector.get('datasourceSrv');
          _this.injector = $injector;
          _this.uiSegmentSrv = uiSegmentSrv;
          _this.q = $q;
          _this.$timeout = $timeout;
          _this.$http = $http;

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
          _this.events.on('refresh', _this.onRefresh.bind(_this));

          _this.writing = false;
          _this.history = [];

          // defaults configs
          var defaults = {
            mode: 'current', // 'write', 'query'
            query: 'SHOW DIAGNOSTICS',
            options: {
              database: null
            },
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
          var txt = "default";
          if (_this.panel.options.database) {
            txt = _this.panel.options.database;
          }
          _this.dbSeg = _this.uiSegmentSrv.newSegment(txt);

          _this.queryInfo = {
            last: 0,
            count: 0,
            queries: []
          };

          if (_this.isShowCurrentQueries() && _this.panel.updateEvery > 0) {
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
              var db = _this2.panel.options.database;
              if (_.isNil(db)) {
                db = ds.database;
              }
              _this2.$http({
                url: ds.urls[0] + '/write?db=' + db,
                method: 'POST',
                data: _this2.writeDataText,
                headers: {
                  "Content-Type": "plain/text"
                }
              }).then(function (rsp) {
                _this2.writing = false;
                console.log("Wrote OK", rsp);
              }, function (err) {
                _this2.writing = false;
                console.log("Wite ERROR", err);
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
                  ds._seriesQuery('kill query ' + qinfo.id, _this3.panel.options).then(function (res) {
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
              ds._seriesQuery('SHOW QUERIES', _this4.panel.options).then(function (data) {
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
          key: 'dbChanged',
          value: function dbChanged() {
            var _this5 = this;

            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              console.log("DB Changed", _this5.dbSeg);
              var db = _this5.dbSeg.value;
              if (db === ds.database || db === "default") {
                _this5.panel.options.database = null;
              } else {
                _this5.panel.options.database = db;
              }
              _this5.configChanged();
            });
          }
        }, {
          key: 'configChanged',
          value: function configChanged() {
            this.error = null;
            if (this.isShowCurrentQueries()) {
              this.updateShowQueries();
            } else {
              this.onQueryChanged();
            }
          }
        }, {
          key: 'getDBsegs',
          value: function getDBsegs() {
            var _this6 = this;

            return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              return ds.metricFindQuery("SHOW DATABASES", _this6.panel.options).then(function (data) {
                var segs = [];
                _.forEach(data, function (val) {
                  segs.push(_this6.uiSegmentSrv.newSegment(val.text));
                });
                return segs;
              }, function (err) {
                console.log("TODO... error???", err);
              });
            });
          }
        }, {
          key: 'getQueryHistory',
          value: function getQueryHistory() {
            return this.history;
          }
        }, {
          key: 'getQueryTemplates',
          value: function getQueryTemplates() {
            return [{ text: 'Show Databases', click: "ctrl.setQuery( 'SHOW DATABASES' );" }, { text: 'Create Database', click: "ctrl.setQuery( 'CREATE DATABASE &quot;db_name&quot;' );" }, { text: 'Drop Database', click: "ctrl.setQuery( 'DROP DATABASE &quot;db_name&quot;' );" }, { text: '--' }, { text: 'Show Measurements', click: "ctrl.setQuery( 'SHOW MEASUREMENTS' );" }, { text: 'Show Field Keys', click: "ctrl.setQuery( 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;' );" }, { text: 'Show Tag Keys', click: "ctrl.setQuery( 'SHOW TAG KEYS FROM &quot;measurement_name&quot;' );" }, { text: 'Show Tag Values', click: "ctrl.setQuery( 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;' );" }, { text: 'Drop Measurement', click: "ctrl.setQuery( 'DROP MEASUREMENT &quot;measurement_name&quot;' );" }, { text: '--' }, { text: 'Show Retention Policies', click: "ctrl.setQuery( 'SHOW RETENTION POLICIES ON &quot;db_name&quot;' );" }, { text: 'Create Retention Policy', click: "ctrl.setQuery( 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT' );" }, { text: 'Drop Retention Policy', click: "ctrl.setQuery( 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;' );" }, { text: '--' }, { text: 'Show Continuous Queries', click: "ctrl.setQuery( 'SHOW CONTINUOUS QUERIES' );" }, { text: 'Create Continuous Query', click: "ctrl.setQuery( 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END' );" }, { text: 'Drop Continuous Query', click: "ctrl.setQuery( 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;' );" }, { text: '--' }, { text: 'Show Users', click: "ctrl.setQuery( 'SHOW USERS' );" },
            //  { text: 'Create User',       click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD &apos;password&apos;" },
            //  { text: 'Create Admin User', click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES" },
            { text: 'Drop User', click: "ctrl.setQuery( 'DROP USER &quot;username&quot;' );" }, { text: '--' }, { text: 'Show Stats', click: "ctrl.setQuery( 'SHOW STATS' );" }, { text: 'Show Diagnostics', click: "ctrl.setQuery( 'SHOW DIAGNOSTICS' );" }];
          }
        }, {
          key: 'setQuery',
          value: function setQuery(txt) {
            this.panel.query = txt;
            this.onQueryChanged();
          }
        }, {
          key: 'isClickableQuery',
          value: function isClickableQuery() {
            if ("SHOW DATABASES" == this.panel.query) {
              return true;
            }
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
            console.log("CLICKED", this.panel.query, res);

            if ("SHOW DATABASES" == this.panel.query) {
              this.panel.query = 'SHOW MEASUREMENTS';
              this.dbSeg = this.uiSegmentSrv.newSegment(res[0]);
              this.dbChanged();
            } else if ("SHOW MEASUREMENTS" == this.panel.query) {
              this.setQuery('SHOW FIELD KEYS FROM "' + res[0] + '"');
            } else if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
              var str = this.panel.query.split(/"/)[1];
              this.setQuery('SELECT "' + res[0] + '" FROM "' + str + '" ORDER BY time desc LIMIT 10');
            }
            return;
          }
        }, {
          key: 'isPostQuery',
          value: function isPostQuery() {
            var q = this.panel.query;
            return !(q.startsWith("SELECT ") || q.startsWith("SHOW "));
          }
        }, {
          key: 'onQueryChanged',
          value: function onQueryChanged() {
            console.log("onQueryChanged()", this.panel.query);
            this.rsp = null;
            if (!this.isPostQuery()) {
              this.doSubmit();
            } else {
              console.log("POST query won't submit automatically");
            }
          }
        }, {
          key: 'doSubmit',
          value: function doSubmit() {
            var _this7 = this;

            var q = this.panel.query;
            console.log("doSubmit()", this);

            this.history.unshift({ text: q, value: q });
            for (var i = 1; i < this.history.length; i++) {
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
            this.runningQuery = true;
            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              //console.log( 'doSubmit >>>', ds, this.panel.query, this.panel.options);
              ds._seriesQuery(_this7.panel.query, _this7.panel.options).then(function (data) {
                //console.log("RSP", this.panel.query, data);
                _this7.rsp = data;
                _this7.runningQuery = false;
                _this7.queryTime = (Date.now() - startTime) / 1000.0;
              }, function (err) {
                // console.log( 'ERROR with series query', err );
                _this7.runningQuery = false;
                _this7.error = err.message;
                _this7.queryTime = (Date.now() - startTime) / 1000.0;
              });
            });
          }
        }, {
          key: 'onPanelInitalized',
          value: function onPanelInitalized() {
            //console.log("onPanelInitalized()")
            this.onQueryChanged();
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
