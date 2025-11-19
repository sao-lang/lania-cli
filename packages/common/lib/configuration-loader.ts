import { CliConfigModule } from '@lania-cli/types';
import { cosmiconfig } from 'cosmiconfig';
const getConfigOptions = (CliConfigModule: CliConfigModule) => {
    if (typeof CliConfigModule === 'string') {
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
                    'prettierrc.config.js',
                    'prettierrc.config.cjs',
                    'prettier.config.js',
                    'prettier.config.cjs',
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
                    '.stylelint.config.js',
                    '.stylelint.config.cjs',
                    'stylelintrc.config.js',
                    'stylelintrc.config.cjs',
                    'stylelint.config.js',
                    'stylelint.config.cjs',
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
            lan: ['lan', ['lan.config.js']],
        };
        const searchModule = map[CliConfigModule];
        return { module: searchModule[0], searchPlaces: searchModule[1] };
    }
    return CliConfigModule;
};

export class ConfigurationLoader {
    static async load(
        CliConfigModule: CliConfigModule,
        configPath?: string,
        loadConfigFile?: (file: string) => Promise<any[] | Record<string, any>>, // 用户自定义 loader 或 undefined
    ) {
        const { module, searchPlaces } = getConfigOptions(CliConfigModule);
        const explorer = cosmiconfig(module, { searchPlaces });
        const result = await (configPath ? explorer.search(configPath) : explorer.search());
        if (!result || result.isEmpty) return {};
        const file = result.filepath;
        if (loadConfigFile) {
            return loadConfigFile(file);
        }
        return result.config ?? {};
    }
}

export default ConfigurationLoader;
