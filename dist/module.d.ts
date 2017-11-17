/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { PanelCtrl } from 'app/plugins/sdk';
declare class InfluxAdminCtrl extends PanelCtrl {
    private templateSrv;
    private $http;
    private uiSegmentSrv;
    private datasourceSrv;
    static templateUrl: string;
    writing: boolean;
    history: Array<any>;
    dbs: Array<string>;
    dbSeg: any;
    ds: any;
    queryInfo: any;
    queryRefresh: any;
    loading: boolean;
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
    };
    /** @ngInject **/
    constructor($scope: any, $injector: any, templateSrv: any, $http: any, uiSegmentSrv: any, datasourceSrv: any);
    isShowQueryWindow(): boolean;
    isShowCurrentQueries(): boolean;
    onInitEditMode(): void;
    writeData(): any;
    askToKillQuery(qinfo: any): void;
    getSecondsFromString(durr: string): Number;
    private updateShowQueries();
    dbChanged(): void;
    configChanged(): void;
    getDBsegs(): any;
    getQueryHistory(): any[];
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
    onRefresh(): void;
}
export { InfluxAdminCtrl as PanelCtrl };
