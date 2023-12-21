// export interface TemplatePlugin {
//     getDependenciesArray(options: TemplateOptions): {
//         dependencies: string[];
//         devDependencies: string[];
//     };
//     getOutputFileTasks(options: TemplateOptions): (() => {
//         templatePath: string;
//         fileName: string;
//         options: Record<string, any>;
//         fileType: CodeType;
//         outputPath: string;
//         hide?: boolean;
//     })[];
// }

/**项目类型*/
export type ProjectType = 'spa' | 'ssr' | 'nodejs' | 'vanilla' | 'toolkit' | 'components';

export type SpaFrame =
    | 'vue'
    | 'react'
    | 'angular'
    | 'svelte'
    | 'preact'
    | 'lit'
    | 'solid'
    | 'alpine';

export type SsrFrame = 'next' | 'nuxt' | 'astro' | 'sveltekit';

export type NodejsFrame = 'nest' | 'egg' | 'express' | 'koa';

export type ComponentsFrame = 'vue' | 'react' | 'svelte';

export type Frame = SpaFrame | SsrFrame | NodejsFrame | ComponentsFrame;

export type CssProcessor = 'less' | 'sass' | 'stylus' | 'tailwindcss' | 'css';

export type LintTool =
    | 'eslint'
    | 'prettier'
    | 'stylelint'
    | 'commitlint'
    | 'markdownlint'
    | 'editorconfig';

export type BuildTool = 'webpack' | 'vite' | 'rollup' | 'tsc' | 'gulp';

export type PkgTool = 'npm' | 'yarn' | 'pnpm';

export type UnitTestTool = 'vitest' | '';

export type DocFrame = 'vitepress';

export type RouterTool = 'vue-router' | 'react-router-dom' | 'svelte-routing' | '';

export type StoreTool = 'pinia' | 'vuex' | 'redux' | 'mobx' | 'recoil' | 'context' | '';

export type ServiceTool = 'axios' | '';

export type ORMTool = 'typeorm' | '';

export interface FileOutputRes {
    content: string | Buffer;
    filePath: string;
}

export interface TemplateOptions {
    name: string;
    type: ProjectType;
    frame: Frame;
    cssProcessor: CssProcessor | undefined;
    lintTools: LintTool[] | undefined;
    packageTool: PkgTool;
    buildTools: BuildTool[] | BuildTool;
    docFrame: DocFrame | undefined;
    useUnitTest: boolean;
    unitTestTool: UnitTestTool | undefined;
    useLintTools: boolean;
    useCssProcessor: boolean;
    useTs: boolean;
    useDocFrame: boolean;
    repository: string;
    initRepository: boolean;
    useRouterTool: boolean;
    routerTool: RouterTool | undefined;
    useStoreTool: boolean;
    storeTool: StoreTool | undefined;
    useServiceTool: boolean;
    serviceTool: ServiceTool | undefined;
    useORMTool: boolean;
    ormTool: ORMTool | undefined;
}

export interface TemplateOptionsNew {
    type:
        | 'classComponent'
        | 'functionComponent'
        | 'template'
        | 'service'
        | 'module'
        | 'filter'
        | 'controller'
        | 'interceptor'
        | 'middleware';
    path: string;
}

export interface Tools {
    cssProcessor: [CssProcessor] | undefined;
    lintTools: LintTool[] | undefined;
    pkgTool: PkgTool;
    buildTools: BuildTool[];
    frame: Frame | undefined;
    unitTestTool: UnitTestTool | undefined;
    docFrame: DocFrame | undefined;
}

export type Strategy = 'stable' | 'latest';

export interface OutputTask {
    fn: () => Promise<{
        message: string;
        status: 'fail' | 'succeed' | 'stop';
        error: null | Error;
    }>;
    condition: boolean;
    filePath: string;
}

export interface Config extends TemplateOptions {
    type: ProjectType;
    name: string;
    commit: {
        useInCli: boolean;
        types: {
            value: string;
            name: string;
        }[];
    };
}
