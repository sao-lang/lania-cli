import { DependencyAndVersion, InteractionConfig, LintToolEnum } from '@lania-cli/types';

export const TYPESCRIPT_DEV_DEPENDENCIES = ['typescript', '@types/node'];

export const VITE_DEV_DEPENDENCIES = ['vite-plugin-compression', 'terser'];

export const VITE_DEV_TS_DEPENDENCIES = ['vite-plugin-dts'];

export const TEST_DEPENPENCIES = ['vitest'];

export const DOC_DEPENPENCIES = ['vitepress'];

export const getLintDevPenpencies = (
    options: InteractionConfig,
): (string | DependencyAndVersion)[] => {
    const depsMap = new Map<string, string | DependencyAndVersion>();
    const { lintTools, useTs } = options;
    const hasLintTool = (tool: LintToolEnum) => lintTools.includes(tool);
    const addDep = (dep: string | DependencyAndVersion) => {
        const key = typeof dep === 'string' ? dep : dep.key;
        depsMap.set(key, typeof dep === 'string' ? dep : { key, version: dep.version });
    };
    const lintToolDepsMap: Record<
        LintToolEnum.eslint | LintToolEnum.prettier | LintToolEnum.commitlint,
        (string | DependencyAndVersion)[]
    > = {
        [LintToolEnum.eslint]: [
            '@eslint/js',
            'eslint-plugin-vue',
            'eslint',
            'globals',
            'vue-eslint-parser',
        ],
        [LintToolEnum.prettier]: ['prettier'],
        [LintToolEnum.commitlint]: [
            '@commitlint/cli',
            '@commitlint/config-conventional',
            'commitizen',
            'cz-customizable',
        ],
    };

    const addLintToolDeps = () => {
        lintTools.forEach((tool, index) => {
            if (index === 0) {
                ['husky', 'lint-staged'].forEach(addDep);
            }
            lintToolDepsMap[tool]?.forEach(addDep);
        });
    };

    const handleESLintExtras = () => {
        if (!hasLintTool(LintToolEnum.eslint)) return;

        if (useTs) {
            [
                'typescript-eslint',
                '@typescript-eslint/parser',
                '@typescript-eslint/eslint-plugin',
            ].forEach(addDep);
        }

        if (hasLintTool(LintToolEnum.prettier)) {
            ['eslint-config-prettier', 'eslint-plugin-prettier'].forEach(addDep);
        }
    };

    addLintToolDeps();
    handleESLintExtras();

    return Array.from(depsMap.values());
};
