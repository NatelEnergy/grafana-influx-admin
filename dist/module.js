///<reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
System.register(['app/core/config', 'app/core/app_events', 'app/plugins/sdk', 'lodash', 'moment'], function(exports_1) {
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var config_1, app_events_1, sdk_1, lodash_1, moment_1;
    var InfluxAdminCtrl;
    return {
        setters:[
            function (config_1_1) {
                config_1 = config_1_1;
            },
            function (app_events_1_1) {
                app_events_1 = app_events_1_1;
            },
            function (sdk_1_1) {
                sdk_1 = sdk_1_1;
            },
            function (lodash_1_1) {
                lodash_1 = lodash_1_1;
            },
            function (moment_1_1) {
                moment_1 = moment_1_1;
            }],
        execute: function() {
            InfluxAdminCtrl = (function (_super) {
                __extends(InfluxAdminCtrl, _super);
                /** @ngInject **/
                function InfluxAdminCtrl($scope, $injector, $http, uiSegmentSrv) {
                    _super.call(this, $scope, $injector);
                    this.$http = $http;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.defaults = {
                        mode: 'current',
                        query: 'SHOW DIAGNOSTICS',
                        database: null,
                        time: 'YYYY-MM-DDTHH:mm:ssZ',
                        refresh: false,
                        refreshInterval: 1200,
                        allowDatabaseQuery: true,
                    };
                    this.commonQueries = {
                        cPd: 'SELECT numSeries FROM "_internal".."database" WHERE time > now() - 10s GROUP BY "database" ORDER BY desc LIMIT 1',
                        cAd: 'SELECT sum(numSeries) AS "total_series" FROM "_internal".."database" WHERE time > now() - 10s',
                        createuser: 'CREATE USER "jdoe" WITH PASSWORD \'1337password\'',
                        createadmin: 'CREATE USER "jdoe" WITH PASSWORD \'1337password\' WITH ALL PRIVILEGES',
                    };
                    console.log('INFLUX', config_1.default);
                    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
                    this.events.on('panel-initialized', this.onPanelInitalized.bind(this));
                    this.writing = false;
                    this.history = [];
                    // defaults configs
                    lodash_1.default.defaultsDeep(this.panel, this.defaults);
                    var txt = this.panel.database;
                    if (lodash_1.default.isNil(txt)) {
                        txt = '(default)';
                    }
                    this.dbSeg = this.uiSegmentSrv.newSegment(txt);
                    this.queryInfo = {
                        last: 0,
                        count: 0,
                        queries: [],
                    };
                }
                InfluxAdminCtrl.prototype.onPanelInitalized = function () {
                    var _this = this;
                    if (lodash_1.default.isNil(this.panel.datasource)) {
                        this.getDatasources().then(function (dss) {
                            if (lodash_1.default.size(dss) > 0) {
                                _this.datasourceChanged(dss[0]);
                            }
                        });
                    }
                };
                InfluxAdminCtrl.prototype.isShowQueryWindow = function () {
                    return this.panel.mode == 'query';
                };
                InfluxAdminCtrl.prototype.isShowCurrentQueries = function () {
                    return this.panel.mode == 'current';
                };
                // This gets called at each 'refresh'
                InfluxAdminCtrl.prototype.issueQueries = function (datasource) {
                    if (this.isShowCurrentQueries()) {
                        this.updateShowQueries();
                    }
                    else {
                        if (!this.isPostQuery()) {
                            this.doSubmit();
                        }
                    }
                    // Return empty results
                    return null; //this.$q.when( [] );
                };
                // Overrides the default handling
                InfluxAdminCtrl.prototype.handleQueryResult = function (result) {
                    // ignore the nullconsole.log('handleQueryResult', result);
                };
                InfluxAdminCtrl.prototype.onInitEditMode = function () {
                    this.editorTabs.splice(1, 1); // remove the 'Metrics Tab'
                    this.addEditorTab('Options', 'public/plugins/natel-influx-admin-panel/partials/editor.html', 1);
                    this.addEditorTab('Write Data', 'public/plugins/natel-influx-admin-panel/partials/write.html', 2);
                    this.editorTabIndex = 1;
                };
                InfluxAdminCtrl.prototype.writeData = function () {
                    var _this = this;
                    console.log('WRITE', this.writeDataText);
                    this.writing = true;
                    this.error = null;
                    this.inspector = null;
                    return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        var db = ds.database;
                        if (!lodash_1.default.isNil(_this.panel.database) && _this.panel.allowDatabaseQuery) {
                            db = ds.database;
                        }
                        _this.$http({
                            url: ds.urls[0] + '/write?db=' + db,
                            method: 'POST',
                            data: _this.writeDataText,
                            headers: {
                                'Content-Type': 'plain/text',
                            },
                        }).then(function (rsp) {
                            _this.writing = false;
                            console.log('Wrote OK', rsp.headers());
                        }, function (err) {
                            _this.writing = false;
                            console.log('Wite ERROR', err);
                            _this.error = err.data.error + ' [' + err.status + ']';
                            _this.inspector = { error: err };
                        });
                    });
                };
                InfluxAdminCtrl.prototype.askToKillQuery = function (qinfo) {
                    var _this = this;
                    app_events_1.default.emit('confirm-modal', {
                        title: 'Kill Influx Query',
                        text: 'Are you sure you want to kill this query?',
                        text2: qinfo.query,
                        icon: 'fa-trash',
                        //confirmText: 'yes',
                        yesText: 'Kill Query',
                        onConfirm: function () {
                            _this.datasourceSrv.get(_this.panel.datasource).then(function (ds) {
                                ds._seriesQuery('kill query ' + qinfo.id).then(function (res) {
                                    console.log('killed', qinfo, res);
                                });
                            });
                        },
                    });
                    return;
                };
                InfluxAdminCtrl.prototype.getSecondsFromString = function (durr) {
                    var secs = 0;
                    var parts = durr.match(/(\d*\D*)/g);
                    lodash_1.default.each(parts, function (p) {
                        if (p.length > 1) {
                            var idx = p.length - 1;
                            var unit = p[idx];
                            var mag = 1;
                            if (unit == 's') {
                                // could be 39µs
                                if (p[p.length - 2] == 'µ') {
                                    mag = 0.001;
                                    idx -= 1;
                                }
                            }
                            else if (unit == 'm') {
                                mag = 60;
                            }
                            else if (unit == 'h') {
                                mag = 60 * 60;
                            }
                            secs += parseInt(p.substring(0, idx)) * mag;
                        }
                    });
                    return secs;
                };
                InfluxAdminCtrl.prototype.setErrorIfInvalid = function (ds) {
                    if (ds == null) {
                        if (lodash_1.default.isNil(this.panel.datasource)) {
                            this.reportError('ds', 'No datasource configured');
                        }
                        else {
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
                };
                InfluxAdminCtrl.prototype.updateShowQueries = function () {
                    var _this = this;
                    // Cancel any pending calls
                    this.$timeout.cancel(this.queryRefresh);
                    // Don't query when other things are fullscreen
                    if (this.otherPanelInFullscreenMode()) {
                        return;
                    }
                    this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        _this.ds = ds;
                        if (_this.setErrorIfInvalid(ds)) {
                            return;
                        }
                        _this.loading = true;
                        _this.error = null;
                        ds
                            ._seriesQuery('SHOW QUERIES', _this.panel.options)
                            .then(function (data) {
                            var temp = [];
                            var values = data.results[0].series[0].values;
                            if (values.length == 1 && values[0][1] === 'SHOW QUERIES') {
                            }
                            else {
                                lodash_1.default.forEach(values, function (res) {
                                    // convert the time (string) to seconds (so that sort works!)
                                    var secs = _this.getSecondsFromString(res[3]);
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
                            _this.queryInfo.count++;
                            _this.queryInfo.last = moment_1.default(Date.now());
                            _this.queryInfo.queries = temp;
                            _this.$timeout.cancel(_this.queryRefresh);
                            _this.loading = false;
                            _this.$timeout(function () {
                                _this.renderingCompleted();
                            }, 100);
                            // Check if we should refresh the view
                            if (_this.isShowCurrentQueries() &&
                                _this.panel.refresh &&
                                _this.panel.refreshInterval > 0) {
                                _this.queryRefresh = _this.$timeout(function () {
                                    _this.updateShowQueries();
                                }, _this.panel.refreshInterval);
                            }
                        })
                            .catch(function (err) {
                            _this.reportError('Show Queries', err);
                        });
                    });
                };
                InfluxAdminCtrl.prototype.dbChanged = function () {
                    var _this = this;
                    this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        _this.ds = ds;
                        var db = _this.dbSeg.value;
                        if (db === ds.database || db.startsWith('(')) {
                            _this.panel.database = null;
                        }
                        else {
                            _this.panel.database = db;
                        }
                        console.log('DB Changed!', _this.dbSeg, _this.panel.database);
                        _this.configChanged();
                    });
                };
                InfluxAdminCtrl.prototype.configChanged = function () {
                    this.error = null;
                    if (this.isShowCurrentQueries()) {
                        this.updateShowQueries();
                    }
                    else {
                        this.onQueryChanged();
                    }
                };
                // This seems to be required to get the dropdown to be properly initalized
                InfluxAdminCtrl.prototype.initEditorDS = function () {
                    var _this = this;
                    this.getDatasources().then(function (dss) {
                        lodash_1.default.forEach(dss, function (ds) {
                            if (ds.name == _this.panel.datasource) {
                                _this.datasourceChanged(ds);
                                return false;
                            }
                        });
                    });
                };
                // Return only the influx databases.  Even the ones from template varables
                InfluxAdminCtrl.prototype.getDatasources = function () {
                    return Promise.resolve(this.datasourceSrv
                        .getMetricSources()
                        .filter(function (value) {
                        if (value.meta.baseUrl.endsWith('/influxdb')) {
                            return true;
                        }
                        return false;
                    })
                        .map(function (ds) {
                        return { value: ds.value, text: ds.name, datasource: ds };
                    }));
                };
                InfluxAdminCtrl.prototype.datasourceChanged = function (opt) {
                    console.log('Set Datasource: ', opt);
                    this.panel.datasource = opt.value;
                    this.setDatasource(opt.datasource);
                };
                InfluxAdminCtrl.prototype.getDBsegs = function () {
                    var _this = this;
                    return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        return ds
                            .metricFindQuery('SHOW DATABASES')
                            .then(function (data) {
                            var segs = [_this.uiSegmentSrv.newSegment('(' + ds.database + ')')];
                            lodash_1.default.forEach(data, function (val) {
                                segs.push(_this.uiSegmentSrv.newSegment(val.text));
                            });
                            return segs;
                        })
                            .catch(function (err) {
                            console.log('DBSegs error???', err);
                        });
                    });
                };
                InfluxAdminCtrl.prototype.getQueryHistory = function () {
                    return this.history;
                };
                InfluxAdminCtrl.prototype.getQueryTemplates = function () {
                    return [
                        { text: 'Show Databases', click: "ctrl.setQuery( 'SHOW DATABASES' );" },
                        {
                            text: 'Create Database',
                            click: "ctrl.setQuery( 'CREATE DATABASE &quot;db_name&quot;' );",
                        },
                        {
                            text: 'Drop Database',
                            click: "ctrl.setQuery( 'DROP DATABASE &quot;db_name&quot;' );",
                        },
                        { text: '--' },
                        { text: 'Show Measurements', click: "ctrl.setQuery( 'SHOW MEASUREMENTS' );" },
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
                            click: "ctrl.setQuery( 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;' );",
                        },
                        {
                            text: 'Drop Measurement',
                            click: "ctrl.setQuery( 'DROP MEASUREMENT &quot;measurement_name&quot;' );",
                        },
                        { text: '--' },
                        {
                            text: 'Show Retention Policies',
                            click: "ctrl.setQuery( 'SHOW RETENTION POLICIES ON &quot;db_name&quot;' );",
                        },
                        {
                            text: 'Create Retention Policy',
                            click: "ctrl.setQuery( 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT' );",
                        },
                        {
                            text: 'Drop Retention Policy',
                            click: "ctrl.setQuery( 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;' );",
                        },
                        { text: '--' },
                        {
                            text: 'Show Continuous Queries',
                            click: "ctrl.setQuery( 'SHOW CONTINUOUS QUERIES' );",
                        },
                        {
                            text: 'Create Continuous Query',
                            click: "ctrl.setQuery( 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END' );",
                        },
                        {
                            text: 'Drop Continuous Query',
                            click: "ctrl.setQuery( 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;' );",
                        },
                        { text: '--' },
                        { text: 'Show Users', click: "ctrl.setQuery( 'SHOW USERS' );" },
                        { text: 'Create User', click: 'ctrl.setQuery( ctrl.commonQueries.createuser );' },
                        {
                            text: 'Create Admin User',
                            click: 'ctrl.setQuery( ctrl.commonQueries.createadmin );',
                        },
                        { text: 'Drop User', click: "ctrl.setQuery( 'DROP USER &quot;username&quot;' );" },
                        { text: '--' },
                        { text: 'Series cardinality', click: 'ctrl.setQuery( ctrl.commonQueries.cPd );' },
                        {
                            text: 'Series cardinality (all)',
                            click: 'ctrl.setQuery( ctrl.commonQueries.cAd );',
                        },
                        { text: 'Show Stats', click: "ctrl.setQuery( 'SHOW STATS' );" },
                        { text: 'Show Diagnostics', click: "ctrl.setQuery( 'SHOW DIAGNOSTICS' );" },
                    ];
                };
                InfluxAdminCtrl.prototype.setQuery = function (txt) {
                    this.panel.query = txt;
                    this.onQueryChanged();
                };
                InfluxAdminCtrl.prototype.isClickableQuery = function () {
                    var q = this.q;
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
                };
                InfluxAdminCtrl.prototype.onClickedResult = function (res) {
                    console.log('CLICKED', this.panel.query, res);
                    if ('SHOW DATABASES' == this.panel.query && this.panel.queryDB) {
                        this.panel.query = 'SHOW MEASUREMENTS';
                        this.dbSeg = this.uiSegmentSrv.newSegment(res);
                        this.dbChanged();
                    }
                    else if ('SHOW MEASUREMENTS' == this.panel.query) {
                        this.setQuery('SHOW FIELD KEYS FROM "' + res + '"');
                    }
                    else if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
                        var str = this.panel.query.split(/"/)[1];
                        this.setQuery('SELECT "' + res + '" FROM "' + str + '" WHERE $timeFilter LIMIT 10');
                    }
                    return;
                };
                InfluxAdminCtrl.prototype.isPostQuery = function () {
                    var q = this.panel.query;
                    return !(q.startsWith('SELECT ') || q.startsWith('SHOW '));
                };
                InfluxAdminCtrl.prototype.onQueryChanged = function () {
                    console.log('onQueryChanged()', this.panel.query);
                    this.rsp = null;
                    if (!this.isPostQuery()) {
                        this.doSubmit();
                    }
                    else {
                        console.log("POST query won't submit automatically");
                    }
                };
                InfluxAdminCtrl.prototype.doSubmit = function () {
                    var _this = this;
                    var q = this.panel.query;
                    this.history.unshift({ text: q, value: q }); // Keep the template variables
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
                    this.inspector = null;
                    this.clickableQuery = false;
                    this.datasourceSrv
                        .get(this.panel.datasource)
                        .then(function (ds) {
                        _this.ds = ds;
                        if (_this.setErrorIfInvalid(ds)) {
                            return;
                        }
                        var timeFilter = ds.getTimeFilter({ rangeRaw: _this.range.raw });
                        var scopedVars = _this.panel.scopedVars;
                        if (!scopedVars) {
                            scopedVars = {};
                        }
                        scopedVars.timeFilter = { value: timeFilter };
                        _this.q = _this.templateSrv.replace(q, scopedVars);
                        var opts = {};
                        if (_this.panel.allowDatabaseQuery && _this.panel.database) {
                            opts.database = _this.panel.database;
                        }
                        if (_this.isPostQuery()) {
                            opts.method = 'POST';
                            console.log('TODO, change the request to a POST query: ', opts);
                        }
                        _this.loading = true;
                        _this.rspInfo = '...';
                        ds
                            ._seriesQuery(_this.q, opts)
                            .then(function (data) {
                            _this.loading = false;
                            _this.clickableQuery = _this.isClickableQuery();
                            var rowCount = 0;
                            var seriesCount = 0;
                            var queryTime = (Date.now() - startTime) / 1000.0;
                            // Process the timestamps
                            lodash_1.default.forEach(data.results, function (query) {
                                lodash_1.default.forEach(query, function (res) {
                                    if (lodash_1.default.isArray(res)) {
                                        lodash_1.default.forEach(res, function (series) {
                                            if (series.columns && series.columns[0] == 'time') {
                                                lodash_1.default.forEach(series.values, function (row) {
                                                    row[0] = moment_1.default(row[0]).format(_this.panel.time);
                                                });
                                            }
                                            if (series.values) {
                                                rowCount += series.values.length;
                                                if (series.values.length == 1 && !_this.clickableQuery) {
                                                    // Show rows as columns (SHOW DIAGNOSTICS)
                                                    series.rowsAsCols = [];
                                                    lodash_1.default.forEach(series.columns, function (col, idx) {
                                                        var xform = [col];
                                                        lodash_1.default.forEach(series.values, function (row) {
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
                            _this.rsp = data;
                            if (seriesCount > 0) {
                                _this.rspInfo =
                                    seriesCount + ' series, ' + rowCount + ' values, in ' + queryTime + 's';
                            }
                            else {
                                _this.rspInfo = 'No Results in ' + queryTime + 's';
                            }
                            _this.$timeout(function () {
                                _this.renderingCompleted();
                            }, 100);
                        })
                            .catch(function (err) {
                            var queryTime = (Date.now() - startTime) / 1000.0;
                            _this.rspInfo = 'Query in ' + queryTime + 's';
                            _this.reportError('ds._seriesQuery', err);
                            _this.renderingCompleted();
                        });
                    })
                        .catch(function (err) {
                        var queryTime = (Date.now() - startTime) / 1000.0;
                        _this.rspInfo = 'Error in ' + queryTime + 's';
                        _this.reportError('get DS', err);
                    });
                };
                InfluxAdminCtrl.prototype.reportError = function (src, err) {
                    console.log('Error', src, err);
                    this.loading = false;
                    this.clickableQuery = false;
                    if (err.data) {
                        this.error = err.data.message;
                        this.inspector = { error: err };
                        this.rsp = err.data;
                    }
                    else if (err.message) {
                        this.error = err.message;
                    }
                    else {
                        this.error = err;
                    }
                };
                InfluxAdminCtrl.templateUrl = 'partials/module.html';
                InfluxAdminCtrl.scrollable = true;
                return InfluxAdminCtrl;
            })(sdk_1.MetricsPanelCtrl);
            exports_1("PanelCtrl", InfluxAdminCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map