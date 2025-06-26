import {
    AddCommandSupportTemplate,
    BuildToolEnum,
    CssProcessorEnum,
    DocFrameEnum,
    FrameEnum,
    HttpToolEnum,
    LintToolEnum,
    OrmToolEnum,
    PackageToolEnum,
    ProjectTypeEnum,
    RouterManagementToolEnum,
    StoreManagementToolEnum,
    UnitTestFrameEnum,
} from '@lania-cli/types';

export const PROJECT_TYPES = [
    ProjectTypeEnum.spa,
    ProjectTypeEnum.ssr,
    ProjectTypeEnum.nodejs,
    ProjectTypeEnum.toolkit,
    ProjectTypeEnum.components,
    ProjectTypeEnum.vanilla,
];

export const PROJECT_TYPE_FRAMES_MAP = {
    spa: [
        FrameEnum.vue,
        FrameEnum.react,
        FrameEnum.svelte,
        FrameEnum.lit,
        FrameEnum.preact,
        FrameEnum.solid,
        FrameEnum.alpine,
    ],
    ssr: [FrameEnum.next, FrameEnum.nuxt, FrameEnum.astro, FrameEnum.sveltekit],
    nodejs: [FrameEnum.nest, FrameEnum.egg],
    vanilla: [],
    toolkit: [],
    components: [FrameEnum.vue, FrameEnum.react, FrameEnum.svelte],
};

export const APP_PROJECT_BUILD_TOOLS = [BuildToolEnum.webpack, BuildToolEnum.vite];

export const TOOL_PROJECT_BUILD_TOOLS = [BuildToolEnum.gulp, BuildToolEnum.rollup];

export const APP_PROJECTS = [
    ProjectTypeEnum.spa,
    ProjectTypeEnum.ssr,
    ProjectTypeEnum.nodejs,
    ProjectTypeEnum.vanilla,
];

export const TOOL_PROJECTS = [ProjectTypeEnum.toolkit, ProjectTypeEnum.components];

export const NO_FRAME_TYPES = [ProjectTypeEnum.toolkit, ProjectTypeEnum.vanilla];

export const FRAME_TYPES = [
    ProjectTypeEnum.spa,
    ProjectTypeEnum.ssr,
    ProjectTypeEnum.nodejs,
    ProjectTypeEnum.components,
];

export const FRAMES = [
    FrameEnum.vue,
    FrameEnum.react,
    FrameEnum.svelte,
    FrameEnum.lit,
    FrameEnum.preact,
    FrameEnum.solid,
    FrameEnum.alpine,
    FrameEnum.next,
    FrameEnum.nuxt,
    FrameEnum.astro,
    FrameEnum.sveltekit,
    FrameEnum.nest,
    FrameEnum.egg,
];

export const CSS_PROCESSORS = [
    CssProcessorEnum.sass,
    CssProcessorEnum.less,
    CssProcessorEnum.stylus,
    CssProcessorEnum.tailwindcss,
    CssProcessorEnum.css,
];

export const LINT_TOOLS = [
    LintToolEnum.eslint,
    LintToolEnum.prettier,
    LintToolEnum.stylelint,
    LintToolEnum.commitlint,
    LintToolEnum.textlint,
    LintToolEnum.editorconfig,
];

export const LINTERS = [LintToolEnum.eslint, LintToolEnum.prettier, LintToolEnum.stylelint];

export const DOC_FRAMES = [DocFrameEnum.vitepress];

export const UNIT_TEST_TOOLS = [UnitTestFrameEnum.vitest, UnitTestFrameEnum.jest];

export const BUILD_TOOLS = [
    BuildToolEnum.webpack,
    BuildToolEnum.gulp,
    BuildToolEnum.rollup,
    BuildToolEnum.vite,
    BuildToolEnum.tsc,
];

export const PACKAGE_TOOLS = [PackageToolEnum.yarn, PackageToolEnum.npm, PackageToolEnum.pnpm];

export const ROUTER_MANAGEMENT_TOOLS = [
    RouterManagementToolEnum['vue-router'],
    RouterManagementToolEnum['react-router'],
    RouterManagementToolEnum['svelte-routing'],
];

export const STORE_MANAGEMENT_TOOLS = [
    StoreManagementToolEnum.pinia,
    StoreManagementToolEnum.vuex,
    StoreManagementToolEnum.redux,
    StoreManagementToolEnum.mobx,
    StoreManagementToolEnum.recoil,
];

export const HTTP_TOOLS = [HttpToolEnum.axios];

export const ORM_TOOLS = [OrmToolEnum.typeorm];

export const ADD_NEW_REMOTE_CHOICE = 'add new remote';

export const DEFAULT_GSYNC_NORMATIVELY_RULES = [
    { value: 'feat', name: 'feat:     新功能' },
    { value: 'fix', name: 'fix:      修复' },
    { value: 'docs', name: 'docs:     文档变更' },
    { value: 'style', name: 'style:    代码格式(不影响代码运行的变动)' },
    { value: 'refactor', name: 'refactor: 重构(既不是增加feature，也不是修复bug)' },
    { value: 'perf', name: 'perf:     性能优化' },
    { value: 'test', name: 'test:     增加测试' },
    { value: 'chore', name: 'chore:    构建过程或辅助工具的变动' },
    { value: 'revert', name: 'revert:   回退' },
    { value: 'build', name: 'build:    打包' },
];

export const ADD_COMMAND_SUPPORT_TEMPLATES = {
    v2: {
        value: AddCommandSupportTemplate.v2,
        label: 'vue2模板组件'
    },
    v3: {
        value: AddCommandSupportTemplate.v3,
        label: 'vue3模板组件'
    },
    rcc: {
        value: AddCommandSupportTemplate.rcc,
        label: 'react类组件'
    },
    rfc: {
        value: AddCommandSupportTemplate.rfc,
        label: 'react函数式组件',
    },
    svelte: {
        value: AddCommandSupportTemplate.svelte,
        label: 'svelte模板组件',
    },
    jsx: {
        value: AddCommandSupportTemplate.jsx,
        label: 'jsx文件',
    },
    tsx: {
        value: AddCommandSupportTemplate.tsx,
        label: 'tsx文件',
    },
    astro: {
        value: AddCommandSupportTemplate.astro,
        label: 'astro组件',
    },
    axios: {
        value: AddCommandSupportTemplate.axios,
        label: 'axios封装',
    },
    router: {
        value: AddCommandSupportTemplate.router,
        label: '项目路由封装',
    },
    store: {
        value: AddCommandSupportTemplate.store,
        label: '项目状态管理工具封装',
    },
    prettier: {
        value: AddCommandSupportTemplate.prettier,
        label: 'prettier配置文件',
    },
    eslint: {
        value: AddCommandSupportTemplate.eslint,
        label: 'eslint配置文件',
    },
    stylelint: {
        value: AddCommandSupportTemplate.stylelint,
        label: 'stylelint配置文件',
    },
    editorconfig: {
        value: AddCommandSupportTemplate.editorconfig,
        label: 'editorconfig配置文件',
    },
    gitignore: {
        value: AddCommandSupportTemplate.gitignore,
        label: '.gitignore文件',
    },
    tsconfig: {
        value: AddCommandSupportTemplate.tsconfig,
        label: 'tsconfig配置文件',
    },
    commitlint: {
        value: AddCommandSupportTemplate.commitlint,
        label: 'commitlint配置文件',
    },
    commitizen: {
        value: AddCommandSupportTemplate.commitizen,
        label: 'commitizen配置文件',
    },
    packageJson: {
        value: AddCommandSupportTemplate.packageJson,
        label: 'package.json文件',
    },
};
