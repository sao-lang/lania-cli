import getPort from 'get-port';
import { type OutputFileTask, type Template, type TemplateOptions } from '..';
import packageJsonEjs from './templates/package.json.ejs';
import AppJsxEjs from './templates/App.jsx.ejs';
import AppTsxEjs from './templates/App.tsx.ejs';
import mainJsxEjs from './templates/main.jsx.ejs';
import mainTsxEjs from './templates/main.tsx.ejs';
import AppCssEjs from './templates/App.css.ejs';
import AppLessEjs from './templates/App.less.ejs';
import AppScssEjs from './templates/App.scss.ejs';
import AppStylEjs from './templates/App.styl.ejs';
import indexCssEjs from './templates/index.css.ejs';
import indexLessEjs from './templates/index.less.ejs';
import indexScssEjs from './templates/index.scss.ejs';
import indexStylEjs from './templates/index.styl.ejs';
import viteEnvDTsEjs from './templates/vite-env.D.ts.ejs';
import webpackConfigCjsEjs from './templates/webpack.config.cjs.ejs';
import viteConfigCjsEjs from './templates/vite.config.cjs.ejs';
import viteConfigTsEjs from './templates/vite.config.ts.ejs';
import indexHtmlEjs from './templates/index.html.ejs';
import tsconfigJsonEjs from './templates/tsconfig.json.ejs';
import tailwindConfigCjsEjs from './templates/tailwind.config.cjs.ejs';
import tailwindCssEjs from './templates/tailwind.css.ejs';
import postcssConfigCjsEjs from './templates/postcss.config.cjs.ejs';
// import envDevelopment from './templates/.env.development.ejs';
// import envProduction from './templates/.env.production.ejs';
// import configJsEjs from './templates/config.js.ejs';
// import configTsEjs from './templates/config.ts.ejs';
import lanConfigJsonEjs from './templates/lan.config.json.ejs';
import gitignoreEjs from './templates/.gitignore.ejs';
import {
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
} from './constant';

export class SpaReactTemplate implements Template {
    public name = 'spa-react-template';
    public getDependenciesArray(options: TemplateOptions) {
        const dependenciesArray = ['react', 'react-dom'];
        const devDependenciesArray: string[] = this.getDevDependencies(options);
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
        const useEslint = options.lintTools.includes('eslint');
        const usePrettier = options.lintTools.includes('prettier');
        const useStylelint = options.lintTools.includes('stylelint');
        const useEditorConfig = options.lintTools.includes('editorConfig');
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
    public getOutputFileTasks(options: TemplateOptions) {
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
        return [
            async () => {
                // const content = await import('./templates/package.json.ejs');
                return {
                    options,
                    outputPath: '/package.json',
                    content: packageJsonEjs,
                    // content: content.default,
                };
            },
            () => {
                return {
                    options,
                    outputPath: `/src/App.${jsxExtName}`,
                    content: jsxExtName === 'jsx' ? AppJsxEjs : AppTsxEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: `/src/main.${jsxExtName}`,
                    content: jsxExtName === 'jsx' ? mainJsxEjs : mainTsxEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: `/src/App.${cssExtName}`,
                    content: {
                        scss: AppScssEjs,
                        less: AppLessEjs,
                        css: AppCssEjs,
                        styl: AppStylEjs,
                    }[cssExtName],
                };
            },
            () => {
                return {
                    options,
                    outputPath: `/src/index.${cssExtName}`,
                    content: {
                        scss: indexScssEjs,
                        less: indexLessEjs,
                        css: indexCssEjs,
                        styl: indexStylEjs,
                    }[cssExtName],
                };
            },
            () => {
                return {
                    options,
                    outputPath: '/src/vite-env.d.ts',
                    content: viteEnvDTsEjs,
                    hide: options.buildTool !== 'vite',
                };
            },
            async () => {
                const port = await getPort();
                if (options.buildTool === 'webpack') {
                    return {
                        options: { port, ...options },
                        outputPath: '/webpack.config.js',
                        content: webpackConfigCjsEjs,
                    };
                }
                return {
                    options: { port, ...options },
                    outputPath: `/vite.config.${jsExtName}`,
                    content: jsExtName === 'js' ? viteConfigCjsEjs : viteConfigTsEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: '/index.html',
                    content: indexHtmlEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: '/tsconfig.json',
                    hide: !useTs,
                    content: tsconfigJsonEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: '/tailwind.config.js',
                    hide: options.cssProcessor !== 'tailwindcss',
                    content: tailwindConfigCjsEjs,
                };
            },
            () => {
                return {
                    options,
                    hide: options.cssProcessor !== 'tailwindcss',
                    outputPath: '/src/tailwind.css',
                    content: tailwindCssEjs,
                };
            },
            () => {
                return {
                    options,
                    outputPath: '/postcss.config.js',
                    hide: options.cssProcessor !== 'tailwindcss',
                    content: postcssConfigCjsEjs,
                };
            },
            // () => {
            //     return {
            //         options,
            //         content: envDevelopment,
            //         outputPath: '/env/.env.development',
            //         hide: options.buildTool !== 'vite',
            //     };
            // },
            // () => {
            //     return {
            //         options,
            //         outputPath: '/env/.env.production',
            //         hide: options.buildTool !== 'vite',
            //         content: envProduction,
            //     };
            // },
            () => {
                return {
                    options,
                    outputPath: '/.gitignore',
                    content: gitignoreEjs,
                };
            },
            // () => {
            //     return {
            //         options,
            //         outputPath: `/config/index.${jsExtName}`,
            //         content: jsExtName === 'js' ? configJsEjs : configTsEjs,
            //     };
            // },
            () => {
                return {
                    options,
                    outputPath: '/lan.config.json',
                    content: lanConfigJsonEjs,
                };
            },
        ] as (() => OutputFileTask)[] | (() => Promise<OutputFileTask>)[];
    }
}

export default SpaReactTemplate;
