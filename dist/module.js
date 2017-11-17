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
                function InfluxAdminCtrl($scope, $injector, templateSrv, $http, uiSegmentSrv, datasourceSrv) {
                    var _this = this;
                    _super.call(this, $scope, $injector);
                    this.templateSrv = templateSrv;
                    this.$http = $http;
                    this.uiSegmentSrv = uiSegmentSrv;
                    this.datasourceSrv = datasourceSrv;
                    this.loading = false; // should be in base PanelCtrl???
                    this.defaults = {
                        mode: 'current',
                        query: 'SHOW DIAGNOSTICS',
                        database: null,
                        time: 'YYYY-MM-DDTHH:mm:ssZ',
                        refresh: false,
                        refreshInterval: 1200
                    };
                    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
                    this.events.on('refresh', this.onRefresh.bind(this));
                    this.writing = false;
                    this.history = [];
                    // defaults configs
                    lodash_1.default.defaultsDeep(this.panel, this.defaults);
                    // All influxdb datasources
                    this.dbs = [];
                    lodash_1.default.forEach(config_1.default.datasources, function (val, key) {
                        if ("influxdb" == val.type) {
                            if (key == config_1.default.defaultDatasource) {
                                _this.dbs.unshift(key);
                            }
                            else {
                                _this.dbs.push(key);
                            }
                        }
                    });
                    // pick a datasource
                    if (lodash_1.default.isNil(this.panel.datasource)) {
                        if (this.dbs.length > 0) {
                            this.panel.datasource = this.dbs[0];
                        }
                    }
                    var txt = this.panel.datasource;
                    if (lodash_1.default.isNil(txt)) {
                        txt = 'default';
                    }
                    this.dbSeg = this.uiSegmentSrv.newSegment(txt);
                    this.queryInfo = {
                        last: 0,
                        count: 0,
                        queries: []
                    };
                }
                InfluxAdminCtrl.prototype.isShowQueryWindow = function () {
                    return this.panel.mode == 'query';
                };
                InfluxAdminCtrl.prototype.isShowCurrentQueries = function () {
                    return this.panel.mode == 'current';
                };
                InfluxAdminCtrl.prototype.onInitEditMode = function () {
                    this.addEditorTab('Options', 'public/plugins/natel-influx-admin-panel/partials/editor.html', 1);
                    this.addEditorTab('Write Data', 'public/plugins/natel-influx-admin-panel/partials/write.html', 2);
                    this.editorTabIndex = 1;
                };
                InfluxAdminCtrl.prototype.writeData = function () {
                    var _this = this;
                    console.log("WRITE", this.writeDataText);
                    this.writing = true;
                    this.error = null;
                    this.inspector = null;
                    return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        var db = ds.database;
                        if (!lodash_1.default.isNil(_this.panel.options.database) && ds.allowDatabaseQuery) {
                            db = ds.database;
                        }
                        _this.$http({
                            url: ds.urls[0] + '/write?db=' + db,
                            method: 'POST',
                            data: _this.writeDataText,
                            headers: {
                                "Content-Type": "plain/text"
                            }
                        }).then(function (rsp) {
                            _this.writing = false;
                            console.log("Wrote OK", rsp);
                        }, function (err) {
                            _this.writing = false;
                            console.log("Wite ERROR", err);
                            _this.error = err.data.error + " [" + err.status + "]";
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
                        }
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
                            secs += (parseInt(p.substring(0, idx)) * mag);
                        }
                    });
                    return secs;
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
                        _this.loading = true;
                        ds._seriesQuery('SHOW QUERIES', _this.panel.options).then(function (data) {
                            var temp = [];
                            lodash_1.default.forEach(data.results[0].series[0].values, function (res) {
                                // convert the time (string) to seconds (so that sort works!)
                                var secs = _this.getSecondsFromString(res[3]);
                                if ('SHOW QUERIES' == res[1]) {
                                    // Don't include the current query
                                    _this.queryInfo.lastId = res[0];
                                }
                                else {
                                    var status = "";
                                    if (res.length > 3 && res[4] !== 'running') {
                                        status = res[4];
                                    }
                                    ;
                                    temp.push({
                                        secs: secs,
                                        time: res[3],
                                        query: res[1],
                                        db: res[2],
                                        id: res[0],
                                        status: status
                                    });
                                }
                            });
                            _this.queryInfo.count++;
                            _this.queryInfo.last = moment_1.default(Date.now());
                            _this.queryInfo.queries = temp;
                            _this.$timeout.cancel(_this.queryRefresh);
                            _this.loading = false;
                            // Check if we should refresh the view
                            if (_this.isShowCurrentQueries() && _this.panel.refresh && _this.panel.refreshInterval > 0) {
                                _this.queryRefresh = _this.$timeout(function () {
                                    _this.updateShowQueries();
                                }, _this.panel.refreshInterval);
                            }
                        }).catch(function (err) {
                            console.log("Show Query Error: ", err);
                            _this.loading = false;
                        });
                    });
                };
                InfluxAdminCtrl.prototype.dbChanged = function () {
                    var _this = this;
                    this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        _this.ds = ds;
                        console.log("DB Changed", _this.dbSeg);
                        var db = _this.dbSeg.value;
                        if (db === ds.database || db === "default") {
                            _this.panel.options.database = null;
                        }
                        else {
                            _this.panel.options.database = db;
                        }
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
                InfluxAdminCtrl.prototype.getDBsegs = function () {
                    var _this = this;
                    return this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        return ds.metricFindQuery("SHOW DATABASES").then(function (data) {
                            var segs = [];
                            lodash_1.default.forEach(data, function (val) {
                                segs.push(_this.uiSegmentSrv.newSegment(val.text));
                            });
                            return segs;
                        }).catch(function (err) {
                            console.log("DBSegs error???", err);
                        });
                    });
                };
                InfluxAdminCtrl.prototype.getQueryHistory = function () {
                    return this.history;
                };
                InfluxAdminCtrl.prototype.getQueryTemplates = function () {
                    return [
                        { text: 'Show Databases', click: "ctrl.setQuery( 'SHOW DATABASES' );" },
                        { text: 'Create Database', click: "ctrl.setQuery( 'CREATE DATABASE &quot;db_name&quot;' );" },
                        { text: 'Drop Database', click: "ctrl.setQuery( 'DROP DATABASE &quot;db_name&quot;' );" },
                        { text: '--' },
                        { text: 'Show Measurements', click: "ctrl.setQuery( 'SHOW MEASUREMENTS' );" },
                        { text: 'Show Field Keys', click: "ctrl.setQuery( 'SHOW FIELD KEYS FROM &quot;measurement_name&quot;' );" },
                        { text: 'Show Tag Keys', click: "ctrl.setQuery( 'SHOW TAG KEYS FROM &quot;measurement_name&quot;' );" },
                        { text: 'Show Tag Values', click: "ctrl.setQuery( 'SHOW TAG VALUES FROM &quot;measurement_name&quot; WITH KEY = &quot;tag_key&quot;' );" },
                        { text: 'Drop Measurement', click: "ctrl.setQuery( 'DROP MEASUREMENT &quot;measurement_name&quot;' );" },
                        { text: '--' },
                        { text: 'Show Retention Policies', click: "ctrl.setQuery( 'SHOW RETENTION POLICIES ON &quot;db_name&quot;' );" },
                        { text: 'Create Retention Policy', click: "ctrl.setQuery( 'CREATE RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot; DURATION 30d REPLICATION 1 DEFAULT' );" },
                        { text: 'Drop Retention Policy', click: "ctrl.setQuery( 'DROP RETENTION POLICY &quot;rp_name&quot; ON &quot;db_name&quot;' );" },
                        { text: '--' },
                        { text: 'Show Continuous Queries', click: "ctrl.setQuery( 'SHOW CONTINUOUS QUERIES' );" },
                        { text: 'Create Continuous Query', click: "ctrl.setQuery( 'CREATE CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot; BEGIN SELECT min(&quot;field&quot;) INTO &quot;target_measurement&quot; FROM &quot;current_measurement&quot; GROUP BY time(30m) END' );" },
                        { text: 'Drop Continuous Query', click: "ctrl.setQuery( 'DROP CONTINUOUS QUERY &quot;cq_name&quot; ON &quot;db_name&quot;' );" },
                        { text: '--' },
                        { text: 'Show Users', click: "ctrl.setQuery( 'SHOW USERS' );" },
                        //  { text: 'Create User',       click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD &apos;password&apos;" },
                        //  { text: 'Create Admin User', click: "ctrl.query = 'CREATE USER &quot;username&quot; WITH PASSWORD 'password' WITH ALL PRIVILEGES" },
                        { text: 'Drop User', click: "ctrl.setQuery( 'DROP USER &quot;username&quot;' );" },
                        { text: '--' },
                        { text: 'Show Stats', click: "ctrl.setQuery( 'SHOW STATS' );" },
                        { text: 'Show Diagnostics', click: "ctrl.setQuery( 'SHOW DIAGNOSTICS' );" }
                    ];
                };
                InfluxAdminCtrl.prototype.setQuery = function (txt) {
                    this.panel.query = txt;
                    this.onQueryChanged();
                };
                InfluxAdminCtrl.prototype.isClickableQuery = function () {
                    var q = this.q;
                    if (q && q.startsWith('SHOW ')) {
                        if ("SHOW DATABASES" == q && this.panel.queryDB) {
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
                    console.log("CLICKED", this.panel.query, res);
                    if ("SHOW DATABASES" == this.panel.query && this.panel.queryDB) {
                        this.panel.query = 'SHOW MEASUREMENTS';
                        this.dbSeg = this.uiSegmentSrv.newSegment(res);
                        this.dbChanged();
                    }
                    else if ("SHOW MEASUREMENTS" == this.panel.query) {
                        this.setQuery('SHOW FIELD KEYS FROM "' + res + '"');
                    }
                    else if (this.panel.query.startsWith('SHOW FIELD KEYS FROM "')) {
                        var str = this.panel.query.split(/"/)[1];
                        this.setQuery('SELECT "' + res + '" FROM "' + str + '" ORDER BY time desc LIMIT 10');
                    }
                    return;
                };
                InfluxAdminCtrl.prototype.isPostQuery = function () {
                    var q = this.panel.query;
                    return !(q.startsWith("SELECT ") ||
                        q.startsWith("SHOW "));
                };
                InfluxAdminCtrl.prototype.onQueryChanged = function () {
                    console.log("onQueryChanged()", this.panel.query);
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
                    this.q = this.templateSrv.replace(q, this.panel.scopedVars);
                    var startTime = Date.now();
                    this.error = null;
                    this.inspector = null;
                    this.clickableQuery = false;
                    this.datasourceSrv.get(this.panel.datasource).then(function (ds) {
                        _this.ds = ds;
                        var opts = {};
                        if (ds.allowDatabaseQuery && _this.panel.queryDB && _this.panel.database) {
                            opts.database = _this.panel.database;
                        }
                        if (_this.isPostQuery()) {
                            opts.method = 'POST';
                            console.log('TODO, change the request to a POST query: ', opts);
                        }
                        _this.loading = true;
                        ds._seriesQuery(_this.q, opts).then(function (data) {
                            _this.loading = false;
                            _this.clickableQuery = _this.isClickableQuery();
                            var rowCount = 0;
                            var seriesCount = 0;
                            var queryTime = (Date.now() - startTime) / 1000.0;
                            // console.log('GOT result', startTime, Date.now(), queryTime);
                            // Process the timestamps
                            lodash_1.default.forEach(data.results, function (query) {
                                lodash_1.default.forEach(query, function (res) {
                                    lodash_1.default.forEach(res, function (series) {
                                        if (series.columns && series.columns[0] == 'time') {
                                            lodash_1.default.forEach(series.values, function (row) {
                                                row[0] = moment_1.default(row[0]).format(_this.panel.time);
                                            });
                                        }
                                        if (series.values) {
                                            rowCount += series.values.length;
                                            if (series.values.length == 1 && !_this.clickableQuery) {
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
                                });
                            });
                            // Set this after procesing the timestamps
                            _this.rsp = data;
                            if (seriesCount > 0) {
                                _this.rspInfo = seriesCount + ' series, ' + rowCount + ' values, in ' + queryTime + 's';
                            }
                            else {
                                _this.rspInfo = "No Results in " + queryTime + "s";
                            }
                            //console.log('Finished processing', Date.now());
                        }).catch(function (err) {
                            _this.loading = false;
                            _this.clickableQuery = false;
                            if (err.data) {
                                _this.error = err.data.message;
                                _this.inspector = { error: err };
                            }
                            else if (err.message) {
                                _this.error = err.message;
                            }
                            else {
                                _this.error = err;
                            }
                            var queryTime = (Date.now() - startTime) / 1000.0;
                            _this.rspInfo = 'Error in ' + queryTime + 's';
                            console.log('doSubmit error', err, _this);
                        });
                    });
                };
                InfluxAdminCtrl.prototype.onRefresh = function () {
                    if (this.isShowCurrentQueries()) {
                        this.updateShowQueries();
                    }
                    else {
                        if (!this.isPostQuery()) {
                            this.doSubmit();
                        }
                    }
                };
                InfluxAdminCtrl.templateUrl = 'partials/module.html';
                return InfluxAdminCtrl;
            })(sdk_1.PanelCtrl);
            exports_1("PanelCtrl", InfluxAdminCtrl);
        }
    }
});
//# sourceMappingURL=module.js.map