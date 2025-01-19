import {
    BuildToolEnum,
    CssProcessorEnum,
    DocFrameEnum,
    FrameEnum,
    HttpToolEnum,
    LangEnum,
    LintToolEnum,
    OrmToolEnum,
    PackageToolEnum,
    ProjectTypeEnum,
    RouterManagementToolEnum,
    StoreManagementToolEnum,
    UnitTestFrameEnum,
} from '../../enum';

export interface TemplateOptions {
    name: string;
    type: ProjectTypeEnum;
    frame: FrameEnum;
    cssProcessor?: CssProcessorEnum;
    lintTools?: LintToolEnum[];
    packageTool: PackageToolEnum;
    buildTools: BuildToolEnum[] | BuildToolEnum;
    docFrame?: DocFrameEnum;
    useUnitTest: boolean;
    unitTestTool?: UnitTestFrameEnum;
    useLintTools: boolean;
    useCssProcessor: boolean;
    useTs: boolean;
    useDocFrame: boolean;
    repository: string;
    initRepository: boolean;
    useRouterTool: boolean;
    routerTool?: RouterManagementToolEnum;
    useStoreTool: boolean;
    storeTool?: StoreManagementToolEnum;
    useServiceTool: boolean;
    serviceTool?: HttpToolEnum;
    useORMTool: boolean;
    ormTool?: OrmToolEnum;
    directory?: string;
    port?: number | string;
    language?: LangEnum;
    buildTool: BuildToolEnum;
}

export interface OutputFileTask {
    outputPath: string;
    options: TemplateOptions;
    templatePath?: string;
    content?: string;
    hide?: boolean;
}

export interface Template {
    getDependenciesArray(): {
        dependencies: string[];
        devDependencies: string[];
    };
    getOutputFileTasks(): Promise<{
        tasks: OutputFileTask[];
    }>;
}

export interface TaskConfig {
    filePath: string;
    outputPath: string;
    hide?: boolean;
}
