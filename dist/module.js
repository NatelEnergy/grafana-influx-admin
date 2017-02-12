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

        function InfluxAdminCtrl($scope, $injector, $q, $rootScope, $timeout) {
          _classCallCheck(this, InfluxAdminCtrl);

          var _this = _possibleConstructorReturn(this, (InfluxAdminCtrl.__proto__ || Object.getPrototypeOf(InfluxAdminCtrl)).call(this, $scope, $injector));

          _this.datasourceSrv = $injector.get('datasourceSrv');
          _this.injector = $injector;
          _this.q = $q;
          _this.query = "SHOW DIAGNOSTICS";

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('panel-initialized', _this.onPanelInitalized.bind(_this));
          _this.events.on('refresh', _this.onRefresh.bind(_this));

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
          return _this;
        }

        _createClass(InfluxAdminCtrl, [{
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            this.addEditorTab('Options', 'public/plugins/natel-influx-admin/editor.html', 1);
            this.editorTabIndex = 1;
          }
        }, {
          key: 'setQuery',
          value: function setQuery(q) {
            this.query = q;

            console.log("Set Query: ", q);
          }
        }, {
          key: 'askToKillQuery',
          value: function askToKillQuery(qinfo) {
            var _this2 = this;

            appEvents.emit('confirm-modal', {
              title: 'Kill Influx Query',
              text: 'Are you sure you want to kill this query?',
              text2: qinfo.query,
              icon: 'fa-trash',
              confirmText: 'yes',
              yesText: 'Kill Query',
              onConfirm: function onConfirm() {
                _this2.datasourceSrv.get(_this2.panel.datasource).then(function (ds) {
                  ds._seriesQuery('kill query ' + qinfo.id).then(function (res) {
                    console.log('killed', qinfo, res);
                  });
                });
              }
            });
            return;
          }
        }, {
          key: 'onSubmit',
          value: function onSubmit() {
            var _this3 = this;

            this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
              console.log('ds', ds, _this3.query);
              ds._seriesQuery(_this3.query).then(function (data) {
                console.log("RSP", _this3.query, data);
                _this3.rsp = data;
              });

              ds._seriesQuery('SHOW QUERIES').then(function (data) {

                _this3.currentQueries = [];
                // convert the time (string) to seconds
                _.forEach(data.results[0].series[0].values, function (res) {
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

                  _this3.currentQueries.push({
                    'secs': secs,
                    'query': res[1],
                    'db': res[2],
                    'id': res[0]
                  });
                });

                console.log("QUERIES", _this3.currentQueries);
              });
            });
          }
        }, {
          key: 'onPanelInitalized',
          value: function onPanelInitalized() {
            console.log("onPanelInitalized()");
          }
        }, {
          key: 'onRender',
          value: function onRender() {
            console.log("onRender");
          }
        }, {
          key: 'onRefresh',
          value: function onRefresh() {
            console.log("onRefresh");
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
