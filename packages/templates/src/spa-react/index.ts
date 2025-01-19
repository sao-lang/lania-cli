import { LintToolEnum, TaskConfig, TemplateOptions } from '@lania-cli/types';
import { BaseTemplate } from '../template.base';
// import envDevelopment from './templates/.env.development.ejs';
// import envProduction from './templates/.env.production.ejs';
// import configJsEjs from './templates/config.js.ejs';
// import configTsEjs from './templates/config.ts.ejs';
import { TEMPLATES_CONSTANTS } from '@lania-cli/common';
const {
    ESLINT_DEV_DEPENDENCIES,
    ESLINT_PRETTIER_DEV_DEPENDENCIES,
    ESLINT_TYPESCRIPT_DEV_DEPENDENCIES,
    STYLELINT_DEV_DEPENDENCIES,
    STYLELINT_LESS_DEV_DEPENDENCIES,
    STYLELINT_PRETTIER_DEV_DEPENDENCIES,
    STYLELINT_SASS_DEV_DEPENDENCIES,
    STYLELINT_STYLUS_DEV_DEPENDENCIES,
    TAILWIND_DEV_DEPENDENCIES,
    TYPESCRIPT_DEV_DEPENDENCIES,
} = TEMPLATES_CONSTANTS.SPA_REACT_TEMPLATE;

export class SpaReactTemplate extends BaseTemplate {
    static templateName = 'spa-react-template';
    protected taskConfigs: TaskConfig[] = [];
    protected templateFilesDirName = __dirname;
    protected options: TemplateOptions;
    constructor(options: TemplateOptions) {
        super();
        this.options = options;
        const { language, cssProcessor } = options;
        const useTs = language === 'TypeScript';
        const jsxExtName = useTs ? 'tsx' : 'jsx';
        const jsExtName = useTs ? 'ts' : 'js';
        const cssExtMap = {
            sass: 'scss',
            stylus: 'styl',
            less: 'less',
            tailwindcss: 'css',
        };
        const cssExtName = cssExtMap?.[cssProcessor] ?? 'css';
        const useWebpack = options.buildTool === 'webpack';
        this.taskConfigs = [
            { filePath: './templates/package.json.ejs', outputPath: '/package.json' },
            {
                outputPath: `/src/App.${jsxExtName}`,
                filePath:
                    jsxExtName === 'jsx' ? './templates/App.jsx.ejs' : './templates/App.tsx.ejs',
            },
            {
                outputPath: `/src/main.${jsxExtName}`,
                filePath:
                    jsxExtName === 'jsx' ? './templates/main.jsx.ejs' : './templates/main.tsx.ejs',
            },
            {
                outputPath: `/src/App.${cssExtName}`,
                filePath: {
                    scss: './templates/App.scss.ejs',
                    less: './templates/App.less.ejs',
                    css: './templates/App.css.ejs',
                    styl: './templates/App.styl.ejs',
                }[cssExtName],
            },
            {
                outputPath: `/src/index.${cssExtName}`,
                filePath: {
                    scss: './templates/index.scss.ejs',
                    less: './templates/index.less.ejs',
                    css: './templates/index.css.ejs',
                    styl: './templates/index.styl.ejs',
                }[cssExtName],
            },
            {
                outputPath: '/src/vite-env.d.ts',
                filePath: './templates/vite-env.D.ts.ejs',
                hide: options.buildTool !== 'vite',
            },
            {
                outputPath: useWebpack ? '/webpack.config.cjs' : `/vite.config.${jsExtName}`,
                filePath: useWebpack
                    ? './templates/webpack.config.cjs.ejs'
                    : {
                          js: './templates/vite.config.cjs.ejs',
                          ts: './templates/vite.config.ts.ejs',
                      }[jsExtName],
            },
            {
                outputPath: '/index.html',
                filePath: './templates/index.html.ejs',
            },
            {
                outputPath: '/tsconfig.json',
                hide: !useTs,
                filePath: './templates/tsconfig.json.ejs',
            },
            {
                outputPath: '/tailwind.config.js',
                hide: options.cssProcessor !== 'tailwindcss',
                filePath: './templates/tailwind.config.cjs.ejs',
            },
            {
                outputPath: '/postcss.config.js',
                hide: options.cssProcessor !== 'tailwindcss',
                filePath: './templates/postcss.config.cjs.ejs',
            },
            {
                outputPath: '/.gitignore',
                filePath: './templates/.gitignore.ejs',
            },
            {
                outputPath: '/lan.config.json',
                filePath: './templates/.gitignore.ejs',
            },
        ];
    }
    public getDependenciesArray() {
        const dependenciesArray = ['react', 'react-dom'];
        const devDependenciesArray: string[] = this.getDevDependencies(this.options);
        return {
            dependencies: dependenciesArray,
            devDependencies: devDependenciesArray,
        };
    }
    private getDevDependencies(options: TemplateOptions) {
        const devDependencies: string[] = [options.buildTool];
        const buildToolDevDependencies = this.getBuildToolDevDependencies(options);
        const lintToolDevDependencies = this.getLintToolDevDependencies(options);
        devDependencies.push(...buildToolDevDependencies, ...lintToolDevDependencies);
        if (options.language === 'TypeScript') {
            devDependencies.push(...TYPESCRIPT_DEV_DEPENDENCIES);
        }
        if (options.cssProcessor) {
            devDependencies.push(options.cssProcessor);
        }
        if (options.cssProcessor === 'tailwindcss') {
            devDependencies.push(...TAILWIND_DEV_DEPENDENCIES);
        }
        return devDependencies;
    }
    private getBuildToolDevDependencies(options: TemplateOptions) {
        if (options.buildTool === 'webpack') {
            const isNotTailwindcss = options.cssProcessor !== 'tailwindcss';
            return [
                '@babel/plugin-transform-runtime',
                '@babel/runtime',
                '@babel/preset-env',
                '@babel/core',
                options.language === 'TypeScript' ? '@babel/preset-typescript' : '',
                'html-webpack-plugin',
                'mini-css-extract-plugin',
                'babel-loader',
                'copy-webpack-plugin',
                'css-loader',
                'css-minimizer-webpack-plugin',
                'style-loader',
                'webpack-dev-server',
                'webpackbar',
                'postcss',
                'postcss-loader',
                'postcss-preset-env',
                '@pmmmwh/react-refresh-webpack-plugin',
                '@babel/preset-react',
                'webpack-bundle-analyzer',
                'react-refresh',
                isNotTailwindcss ? `${options.cssProcessor}-loader` : '',
                'thread-loader',
                'terser-webpack-plugin',
            ].filter(Boolean);
        }
        if (options.buildTool === 'vite') {
            return [
                '@vitejs/plugin-react',
                'vite-plugin-compression',
                'terser',
                'rollup-plugin-visualizer',
            ];
        }
        return [];
    }
    private getLintToolDevDependencies(options: TemplateOptions) {
        const useEslint = options.lintTools.includes(LintToolEnum.eslint);
        const usePrettier = options.lintTools.includes(LintToolEnum.prettier);
        const useStylelint = options.lintTools.includes(LintToolEnum.stylelint);
        const useEditorConfig = options.lintTools.includes(LintToolEnum.editorconfig);
        const useTs = options.language === 'TypeScript';
        const devDependencies: string[] = [];
        if (usePrettier) {
            devDependencies.push('prettier');
        }
        if (useEslint) {
            devDependencies.push(
                ...ESLINT_DEV_DEPENDENCIES,
                ...(usePrettier ? ESLINT_PRETTIER_DEV_DEPENDENCIES : []),
                ...(useTs ? ESLINT_TYPESCRIPT_DEV_DEPENDENCIES : []),
            );
        }
        if (useEditorConfig) {
            devDependencies.push('editorConfig');
        }
        if (useStylelint) {
            devDependencies.push(
                ...STYLELINT_DEV_DEPENDENCIES,
                ...(usePrettier ? STYLELINT_PRETTIER_DEV_DEPENDENCIES : []),
                ...{
                    sass: STYLELINT_SASS_DEV_DEPENDENCIES,
                    less: STYLELINT_LESS_DEV_DEPENDENCIES,
                    stylus: STYLELINT_STYLUS_DEV_DEPENDENCIES,
                }[options.cssProcessor],
            );
        }
        return devDependencies;
    }
}

export default SpaReactTemplate;
