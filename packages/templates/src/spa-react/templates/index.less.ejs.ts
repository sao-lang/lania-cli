import { TemplateOptions } from '../..';
const content = `
* {
    padding: 0;
    margin: 0;
}`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/index.less',
    hide: options.cssProcessor !== 'less',
});
