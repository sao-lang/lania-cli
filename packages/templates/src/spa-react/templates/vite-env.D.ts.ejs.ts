import { TemplateOptions } from '../..';

const content = '/// <reference types="vite/client" />';
export default (options: TemplateOptions) => ({
    content,
    outputPath: '/vite-env.d.ts',
    hide: options.buildTool !== 'vite' || options.language !== 'TypeScript',
});
