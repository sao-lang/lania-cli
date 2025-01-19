export interface LanConfig {
    language?: 'JavaScript' | 'TypeScript';
    buildTool?: 'tsc' | 'vite' | 'webpack' | 'rollup';
    frame?: 'react' | 'vue' | 'svelte';
    linters?: ({ linter: string; config: Record<string, any> } | string)[];
}
