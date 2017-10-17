/// <reference path="../node_modules/grafana-sdk-mocks/app/headers/common.d.ts" />
import { PanelCtrl } from 'app/plugins/sdk';
declare class InfluxAdminCtrl extends PanelCtrl {
    static templateUrl: string;
    datasourceSrv: any;
    uiSegmentSrv: any;
    q: any;
    $http: any;
    writing: boolean;
    history: Array<any>;
    dbs: Array<string>;
    dbSeg: any;
    queryInfo: any;
    clickableQuery: boolean;
    runningQuery: boolean;
    queryTime: Number;
    rsp: any;
    writeDataText: string;
    defaults: {
        mode: string;
        query: string;
        options: {
            database: any;
        };
        time: string;
        updateEvery: number;
    };
    /** @ngInject **/
    constructor($scope: any, $injector: any, $q: any, $rootScope: any, $http: any, uiSegmentSrv: any);
    isShowQueryWindow(): boolean;
    isShowCurrentQueries(): boolean;
    onInitEditMode(): void;
    writeData(): any;
    askToKillQuery(qinfo: any): void;
    updateShowQueries(): void;
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
    onPanelInitalized(): void;
    onRender(): void;
    onRefresh(): void;
}
export { InfluxAdminCtrl as PanelCtrl };
