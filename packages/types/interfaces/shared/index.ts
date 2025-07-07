import {
    BuildToolEnum,
    CssProcessorEnum,
    CssToolEnum,
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

export interface InteractionConfig {
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
    cssTools?: CssToolEnum[];
}

export interface LaniaConfig {
    name?: string; // 项目名称
    type?: ProjectTypeEnum; // 项目类型：应用 / 库
    language: LangEnum; // 编程语言
    frame: FrameEnum; // 框架类型
    linterTools?: LintToolEnum;
    cssProcessor: CssProcessorEnum; // 主样式方案
    cssTools?: CssToolEnum[]; // 额外的 CSS 工具（如 autoprefixer、postcss-preset-env）
    buildTool?: BuildToolEnum[]; // 构建工具
    packageManager?: PackageToolEnum; // 包管理器
    commands?: Record<string, string>; // 用户自定义命令，key 是别名，value 是实际命令
    docFrame?: DocFrameEnum;
    unitTestFrame?: UnitTestFrameEnum[];
    hooks?: {
        onInit?: string | string[]; // 初始化时执行的脚本或命令
        onBuild?: string | string[]; // 构建前/后执行
        onRelease?: string | string[]; // 发布前/后执行
        [hookName: string]: string | string[] | undefined; // 支持自定义 hook
    };
    custom?: Record<string, any>; // 用户扩展字段（为了未来兼容）
}
