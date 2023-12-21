import path from 'path';
import getPort from 'get-port';

interface TemplateOptions {
    name: string;
    buildTool: string;
    cssProcessor: string;
    packageTool: string;
    lintTools: string[];
    language: 'TypeScript' | 'JavaScript';
}

export default class Template {
    private resolve(targetPath: string) {
        return path.resolve(__dirname, targetPath);
    }
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
                    templatePath: this.resolve('./templates/package.json.ejs'),
                    fileName: 'package.json',
                    options,
                    fileType: 'json',
                    outputPath: '/package.json',
                };
            },
            () => {
                return {
                    templatePath: this.resolve(`./templates/App.${jsxExtName}.ejs`),
                    fileName: `App.${jsxExtName}`,
                    options,
                    fileType: jsxExtName,
                    outputPath: `/src/App.${jsxExtName}`,
                };
            },
            () => {
                return {
                    templatePath: this.resolve(`./templates/main.${jsxExtName}.ejs`),
                    fileName: `main.${jsxExtName}`,
                    options,
                    fileType: jsxExtName,
                    outputPath: `/src/main.${jsxExtName}`,
                };
            },
            () => {
                return {
                    templatePath: this.resolve(`./templates/App.${cssExtName}.ejs`),
                    fileName: `App.${cssExtName}`,
                    options,
                    fileType:
                        !cssProcessor || cssProcessor === 'tailwindcss' ? 'css' : cssProcessor,
                    outputPath: `/src/App.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: this.resolve(`./templates/index.${cssExtName}.ejs`),
                    fileName: `index.${cssExtName}`,
                    options,
                    fileType: cssProcessor === 'tailwindcss' ? 'css' : cssProcessor,
                    outputPath: `/src/index.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/vite-env.d.ts.ejs'),
                    fileName: 'vite-env.d.ts',
                    options,
                    fileType: 'ts',
                    outputPath: '/src/vite-env.d.ts',
                    hide: options.buildTool !== 'vite',
                };
            },
            async () => {
                const port = await getPort();
                if (options.buildTool === 'webpack') {
                    return {
                        templatePath: this.resolve('./templates/webpack.config.js.ejs'),
                        fileName: 'webpack.config.js',
                        options: { port, ...options },
                        fileType: 'js',
                        outputPath: '/webpack.config.js',
                    };
                }
                return {
                    templatePath: this.resolve(`./templates/index.${cssExtName}.ejs`),
                    fileName: `index.${cssExtName}`,
                    options,
                    fileType:
                        !cssProcessor || cssProcessor === 'tailwindcss' ? 'css' : cssProcessor,
                    outputPath: `/src/index.${cssExtName}`,
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/lan.config.json.ejs'),
                    fileName: 'lan.config.json',
                    options,
                    fileType: 'json',
                    outputPath: '/lan.config.json',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/index.html.ejs'),
                    fileName: 'index.html',
                    options,
                    fileType: 'html',
                    outputPath: '/index.html',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/tsconfig.json.ejs'),
                    fileName: 'tsconfig.json',
                    options,
                    fileType: 'json',
                    outputPath: '/tsconfig.json',
                    hide: !useTs,
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/tailwind.config.js.ejs'),
                    fileName: 'tailwind.config.js',
                    options,
                    fileType: 'js',
                    outputPath: '/tailwind.config.js',
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/tailwind.css.ejs'),
                    fileName: 'tailwind.css',
                    options,
                    fileType: 'css',
                    outputPath: '/src/tailwind.css',
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/postcss.config.js.ejs'),
                    fileName: 'postcss.config.js',
                    options,
                    fileType: 'js',
                    outputPath: '/postcss.config.js',
                    hide: options.cssProcessor !== 'tailwindcss',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/.env.development.ejs'),
                    fileName: '.env.development',
                    options,
                    fileType: 'other',
                    outputPath: '/env/.env.development',
                    hide: options.buildTool !== 'vite',
                };
            },
            () => {
                return {
                    templatePath: this.resolve('./templates/.env.production.ejs'),
                    fileName: '.env.production',
                    options,
                    fileType: 'other',
                    outputPath: '/env/.env.production',
                    hide: options.buildTool !== 'vite',
                };
            },
            () => {
                return {
                    templatePath: this.resolve(`./templates/config.${jsExtName}.ejs`),
                    fileName: `config.${jsExtName}`,
                    options,
                    fileType: jsExtName,
                    outputPath: `/src/config/index.${jsExtName}`,
                };
            },
        ];
    }
}
