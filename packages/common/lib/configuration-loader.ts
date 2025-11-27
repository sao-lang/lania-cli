import { cosmiconfig } from 'cosmiconfig';
import { ConfigurationLoadType, CliConfigModule } from '@lania-cli/types';
type ConfigTuple = [string, string[]]; // [cosmiconfig_module_name, search_places]

// --- 查找列表辅助函数 ---

const getCommonRcFiles = (name: string): string[] => [
    `.${name}rc`,
    `.${name}rc.json`,
    `.${name}rc.yaml`,
    `.${name}rc.yml`,
    `.${name}rc.js`,
    `.${name}rc.cjs`,
];

const getCommonConfigFiles = (name: string): string[] => [
    `${name}.config.js`,
    `${name}.config.cjs`,
    `.${name}rc.config.js`,
    `.${name}rc.config.cjs`,
];

// --- 配置查找映射 ---

const MODULE_MAP: Record<ConfigurationLoadType, ConfigTuple> = {
    // 包管理器配置
    package: ['package', ['package.json']],
    npm: ['npm', ['.npmrc']],
    pnpm: ['pnpm', ['pnpmfile.js', 'pnpmfile.cjs']],

    // 代码规范工具配置
    prettier: ['prettier', [...getCommonRcFiles('prettier'), ...getCommonConfigFiles('prettier')]],
    eslint: [
        'eslint',
        [...getCommonRcFiles('eslintrc'), ...getCommonConfigFiles('eslintrc'), '.eslintrc'],
    ],
    stylelint: [
        'stylelint',
        [...getCommonRcFiles('stylelint'), ...getCommonConfigFiles('stylelint')],
    ],
    markdownlint: [
        'markdownlint',
        ['.markdownlint.json', '.markdownlint.yml', '.markdownlint.yaml'],
    ],
    editorconfig: ['editorconfig', ['.editorconfig']],

    // Git/Commit 相关配置
    commitlint: [
        'commitlint',
        [...getCommonConfigFiles('commitlint'), ...getCommonRcFiles('commitlint')],
    ],
    // 新增 Commitizen 配置
    cz: ['cz', ['.czrc', '.cz.json', 'cz.config.js', 'cz.config.cjs']],
    commitizen: ['cz', ['.czrc', '.cz.json', 'cz.config.js', 'cz.config.cjs']],

    // 构建工具配置
    webpack: ['webpack', ['webpack.config.js', 'webpack.config.cjs']],
    vite: ['vite', ['vite.config.js', 'vite.config.cjs', 'vite.config.ts']],
    gulp: ['gulp', ['gulpfile.js', 'gulpfile.cjs']],
    rollup: ['rollup', ['rollup.config.js', 'rollup.config.cjs']],
    tsc: ['tsc', ['tsconfig.json']],
    // 自定义 CLI 配置
    lan: ['lan', ['lan.config.js']],
} as any;

const getConfigOptions = (CliConfigModule: CliConfigModule): CliConfigModule => {
    if (typeof CliConfigModule === 'string') {
        const searchModule = MODULE_MAP[CliConfigModule];
        if (!searchModule) {
            throw new Error(`Unknown configuration module: ${CliConfigModule}`);
        }
        return { module: searchModule[0], searchPlaces: searchModule[1] };
    }
    // 如果传入的是已解析的对象
    return CliConfigModule;
};

export class ConfigurationLoader {
    // 优化：可以考虑增加一个静态缓存 Map<ConfigurationLoadType, any>
    static async load(
        CliConfigModule: CliConfigModule,
        configPath?: string,
        // loadConfigFile现在应该返回 Promise<any>
        loadConfigFile?: (file: string) => Promise<any>,
    ) {
        // 优化：类型断言以确保返回 ConfigTuple
        const { module, searchPlaces } = getConfigOptions(CliConfigModule) as unknown as {
            module: string;
            searchPlaces: string[];
        };

        const explorer = cosmiconfig(module, {
            searchPlaces,
        });

        let result;
        if (configPath) {
            // 优化 1：尝试直接加载指定路径，如果失败，再执行搜索
            try {
                // 如果 configPath 是确切的文件名
                result = await explorer.load(configPath);
            } catch (e) {
                // 如果 load 失败（例如 configPath 是一个目录），退回到 search
                result = await explorer.search(configPath);
            }
        } else {
            // 默认从当前目录向上搜索
            result = await explorer.search();
        }

        // 优化 2：统一处理空结果和空配置
        if (!result || result.isEmpty || !result.config) {
            return {};
        }

        const file = result.filepath;
        const finalConfig = result.config;

        if (loadConfigFile) {
            // 如果提供了自定义加载器，使用它
            return loadConfigFile(file);
        }

        // 返回最终配置
        return finalConfig;
    }
}

export default ConfigurationLoader;
