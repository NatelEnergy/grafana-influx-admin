/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { MetricsPanelCtrl } from 'app/plugins/sdk';
declare class InfluxAdminCtrl extends MetricsPanelCtrl {
    private $http;
    private uiSegmentSrv;
    static templateUrl: string;
    writing: boolean;
    history: Array<any>;
    dbs: Array<string>;
    dbSeg: any;
    ds: any;
    queryInfo: any;
    queryRefresh: any;
    clickableQuery: boolean;
    rsp: any;
    rspInfo: string;
    writeDataText: string;
    q: string;
    defaults: {
        mode: string;
        query: string;
        database: any;
        time: string;
        refresh: boolean;
        refreshInterval: number;
        scopedVars: {};
    };
    /** @ngInject **/
    constructor($scope: any, $injector: any, $http: any, uiSegmentSrv: any);
    isShowQueryWindow(): boolean;
    isShowCurrentQueries(): boolean;
    issueQueries(datasource: any): any;
    handleQueryResult(result: any): void;
    onInitEditMode(): void;
    writeData(): any;
    askToKillQuery(qinfo: any): void;
    getSecondsFromString(durr: string): Number;
    private updateShowQueries();
    dbChanged(): void;
    configChanged(): void;
    getDBsegs(): any;
    getQueryHistory(): any[];
    commonQueries: {
        cPd: string;
        cAd: string;
        createuser: string;
        createadmin: string;
    };
    getQueryTemplates(): ({
        text: string;
        click: string;
    } | {
        text: string;
    })[];
    setQuery(txt: any): void;
    isClickableQuery(): boolean;
    onClickedResult(res: any): void;
    isPostQuery(): boolean;
    onQueryChanged(): void;
    doSubmit(): void;
    private reportError(src, err);
}
export { InfluxAdminCtrl as PanelCtrl };
