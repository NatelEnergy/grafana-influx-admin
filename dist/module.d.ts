/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { MetricsPanelCtrl } from 'app/plugins/sdk';
declare class InfluxAdminCtrl extends MetricsPanelCtrl {
    private $http;
    private uiSegmentSrv;
    static templateUrl: string;
    static scrollable: boolean;
    writing: boolean;
    history: Array<any>;
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
        allowDatabaseQuery: boolean;
    };
    /** @ngInject **/
    constructor($scope: any, $injector: any, $http: any, uiSegmentSrv: any);
    onPanelInitalized(): void;
    isShowQueryWindow(): boolean;
    isShowCurrentQueries(): boolean;
    issueQueries(datasource: any): any;
    handleQueryResult(result: any): void;
    onInitEditMode(): void;
    writeData(): any;
    askToKillQuery(qinfo: any): void;
    getSecondsFromString(durr: string): Number;
    private setErrorIfInvalid(ds);
    private updateShowQueries();
    dbChanged(): void;
    configChanged(): void;
    private initEditorDS();
    private getDatasources();
    private datasourceChanged(opt);
    private getDBsegs();
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
