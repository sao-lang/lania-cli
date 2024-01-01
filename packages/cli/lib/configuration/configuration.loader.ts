import { cosmiconfig } from 'cosmiconfig';
export type ConfigurationLoadType =
    | 'npm'
    | 'pnpm'
    | 'yarn'
    | 'prettier'
    | 'package'
    | 'eslint'
    | 'stylelint'
    | 'commitlint'
    | 'markdownlint'
    | 'tsc'
    | 'editorconfig'
    | 'webpack'
    | 'vite'
    | 'gulp'
    | 'rollup';

export default class ConfigurationLoader {
    public async load(
        moduleName: ConfigurationLoadType | { module: string; searchPlaces?: string[] },
        path?: string,
    ) {
        let module = '';
        let searchPlaces: string[] = [];
        if (typeof moduleName === 'string') {
            const map = {
                package: ['package', ['package.json']],
                npm: ['npm', ['.npmrc']],
                pnpm: ['pnpm', ['pnpmfile.js', 'pnpmfile.cjs']],
                prettier: [
                    'prettier',
                    [
                        '.prettierrc',
                        '.prettierrc.cjs',
                        '.prettierrc.json',
                        '.prettierrc.yaml',
                        '.prettierrc.yml',
                        '.prettierrc.config.js',
                        '.prettierrc.config.cjs',
                    ],
                ],
                eslint: [
                    'eslint',
                    [
                        '.eslintrc',
                        '.eslintrc.js',
                        '.eslintrc.cjs',
                        '.eslintrc.yaml',
                        '.eslintrc.yml',
                        '.eslintrc.json',
                        '.eslintrc.config.js',
                        '.eslintrc.config.cjs',
                    ],
                ],
                stylelint: [
                    'stylelint',
                    [
                        '.stylelintrc',
                        '.stylelintrc.js',
                        '.stylelintrc.cjs',
                        '.stylelintrc.yaml',
                        '.stylelintrc.yml',
                        '.stylelintrc.json',
                        '.stylelintrc.config.js',
                        '.stylelintrc.config.cjs',
                    ],
                ],
                markdownlint: [
                    'markdownlint',
                    ['.markdownlint.json', '.markdownlint.yml', '.markdownlint.yaml'],
                ],
                commitlint: [
                    'commitlint',
                    [
                        'commitlint.config.js',
                        'commitlint.config.cjs',
                        '.commitlintrc.js',
                        '.commitlintrc.cjs',
                    ],
                ],
                editorconfig: ['editorconfig', ['.editorconfig']],
                webpack: ['webpack', ['webpack.config.js', 'webpack.config.cjs']],
                vite: ['vite', ['vite.config.js', 'vite.config.cjs', 'vite.config.ts']],
                gulp: ['gulp', ['gulpfile.js', 'gulpfile.cjs']],
                rollup: ['rollup', ['rollup.config.js', 'rollup.config.cjs']],
                tsc: ['tsc', ['tsconfig.json']],
            };
            const searchModule = map[moduleName];
            module = searchModule[0];
            searchPlaces = searchModule[1];
        } else {
            module = moduleName.module;
            searchPlaces = moduleName.searchPlaces;
        }
        const result = await cosmiconfig(module, { searchPlaces }).search(path);
        if (result?.isEmpty) {
            throw new Error('No configuration found!');
        }
        return result.config as Record<string, any>;
    }
}
