import { BuildToolEnum, LangEnum, TemplateOptions } from '@lania-cli/types';

const content = '/// <reference types="vite/client" />';
export default (options: TemplateOptions) => ({
    content,
    outputPath: '/vite-env.d.ts',
    hide: options.buildTool !== BuildToolEnum.vite || options.language !== LangEnum.TypeScript,
});
