import getPort from 'get-port';
import { OutputFileTask, Template, type TemplateOptions } from '..';
import { resolvePath } from '../utils';

export class SpaReactTemplate implements Template {
    public getDependenciesArray(options: TemplateOptions) {
        const dependenciesArray = ['react', 'react-dom'];
        const devDependenciesArray: string[] = [options.buildTool];
        if (options.language === 'TypeScript') {
            devDependenciesArray.push(
                '@types/react',
                '@types/react-dom',
                'typescript',
                '@types/node',
            );
        }
        if (options.cssProcessor) {
            devDependenciesArray.push(options.cssProcessor);
        }
        if (options.buildTool === 'webpack') {
            const isNotTailwindcss = options.cssProcessor !== 'tailwindcss';
            devDependenciesArray.push(
                ...[
                    'webpack-cli',
                    '@babel/plugin-transform-runtime',
                    '@babel/runtime',
                    '@babel/preset-env',
                    '@babel/core',
                    options.language === 'TypeScript' ? '@babel/preset-typescript' : '',
                    'webpack',
                    'webpack-cli',
                    'html-webpack-plugin',
                    'mini-css-extract-plugin',
                    'babel-loader',
                    'copy-webpack-plugin',
                    'cross-env',
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
                    '@types/estree',
                    isNotTailwindcss ? `${options.cssProcessor}-loader` : '',
                    'thread-loader',
                ].filter(Boolean),
            );
        }
        if (options.buildTool === 'vite') {
            devDependenciesArray.push(
                '@vitejs/plugin-react',
                'vite-plugin-compression',
                'terser',
                'rollup-plugin-visualizer',
            );
        }
        if (options.cssProcessor === 'tailwindcss') {
            devDependenciesArray.push('tailwindcss', 'postcss', 'autoprefixer');
        }
        return {
            dependencies: dependenciesArray,
            devDependencies: devDependenciesArray,
        };
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
            () => {
                return {
                    templatePath: resolvePath('./templates/package.json.ejs'),
                    options,
                    outputPath: '/package.json',
                };
            },
            () => {
                return {
                    templatePath: resolvePath(`./templates/App.${jsxExtName}.ejs`),
                    options,
                    outputPath: `/src/App.${jsxExtName}`,
                };
            },
            () => {
                return {
                    templatePath: resolvePath(`./templates/main.${jsxExtName}.ejs`),
                    options,
                    outputPath: `/src/main.${jsxExtName}`,
                };
            },
            () => {
                return {
                    templatePath: resolvePath(`./templates/App.${cssExtName}.ejs`),
                    options,
                    outputPath: `/src/App.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: resolvePath(`./templates/index.${cssExtName}.ejs`),
                    options,
                    outputPath: `/src/index.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/vite-env.d.ts.ejs'),
                    options,
                    outputPath: '/src/vite-env.d.ts',
                    hide: options.buildTool !== 'vite',
                };
            },
            async () => {
                const port = await getPort();
                if (options.buildTool === 'webpack') {
                    return {
                        templatePath: resolvePath('./templates/webpack.config.js.ejs'),
                        options: { port, ...options },
                        outputPath: '/webpack.config.js',
                    };
                }
                return {
                    templatePath: resolvePath(`./templates/index.${cssExtName}.ejs`),
                    options,
                    outputPath: `/src/index.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/lan.config.json.ejs'),
                    options,
                    outputPath: '/lan.config.json',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/index.html.ejs'),
                    options,
                    outputPath: '/index.html',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/tsconfig.json.ejs'),
                    options,
                    outputPath: '/tsconfig.json',
                    hide: !useTs,
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/tailwind.config.js.ejs'),
                    options,
                    outputPath: '/tailwind.config.js',
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/tailwind.css.ejs'),
                    options,
                    fileType: 'css',
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/postcss.config.js.ejs'),
                    options,
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/.env.development.ejs'),
                    options,
                    outputPath: '/env/.env.development',
                    hide: options.buildTool !== 'vite',
                };
            },
            () => {
                return {
                    templatePath: resolvePath('./templates/.env.production.ejs'),
                    options,
                    outputPath: '/env/.env.production',
                    hide: options.buildTool !== 'vite',
                };
            },
            () => {
                return {
                    templatePath: resolvePath(`./templates/config.${jsExtName}.ejs`),
                    options,
                    outputPath: `/src/config/index.${jsExtName}`,
                };
            },
        ] as (() => OutputFileTask)[] | (() => Promise<OutputFileTask>)[];
    }
}

export default SpaReactTemplate;
