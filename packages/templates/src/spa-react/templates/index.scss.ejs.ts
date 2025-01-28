import { CssProcessorEnum, TemplateOptions } from '@lania-cli/types';
const content = `
* {
    padding: 0;
    margin: 0;
}`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/index.scss',
    hide: options.cssProcessor !== CssProcessorEnum.sass,
});
