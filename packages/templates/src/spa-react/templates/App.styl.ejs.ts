import { TemplateOptions } from '../..';

const content = `
.button {
    border: 2px solid black;
    border-radius: 3px;
    padding: 3px;
    cursor: pointer;
}`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/src/App.styl',
    hide: options.cssProcessor !== 'stylus',
});
