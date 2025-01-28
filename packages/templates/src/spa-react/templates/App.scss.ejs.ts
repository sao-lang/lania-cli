import { CssProcessorEnum, TemplateOptions } from '@lania-cli/types';

const content = `
.button {
    border: 2px solid black;
    border-radius: 3px;
    padding: 3px;
    cursor: pointer;
}`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/src/App.scss',
    hide: options.cssProcessor !== CssProcessorEnum.sass,
});
