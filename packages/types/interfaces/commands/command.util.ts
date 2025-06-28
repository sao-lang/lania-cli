import { LangEnum } from '../../enum';

export interface LanConfig {
    language?: LangEnum;
    buildTool?: 'tsc' | 'vite' | 'webpack' | 'rollup';
    frame?: 'react' | 'vue' | 'svelte';
    linters?: ({ linter: string; config: Record<string, any> } | string)[];
}
