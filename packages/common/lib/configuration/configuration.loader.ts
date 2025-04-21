import { ModuleName } from '@lania-cli/types';
import { cosmiconfig } from 'cosmiconfig';

const getConfigOptions = (moduleName: ModuleName) => {
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
        return { module: searchModule[0], searchPlaces: searchModule[1] };
    }
    return moduleName;
};

export  class ConfigurationLoader {
    static async load(moduleName: ModuleName, configPath?: string) {
        const { module, searchPlaces } = getConfigOptions(moduleName);
        const result = await cosmiconfig(module, { searchPlaces }).search(configPath);
        if (!result || result?.isEmpty) {
            return {} as Record<string, any>;
        }
        return result.config as Record<string, any>;
    }
}
export default ConfigurationLoader;
