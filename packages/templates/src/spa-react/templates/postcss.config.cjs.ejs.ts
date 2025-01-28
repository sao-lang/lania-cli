import { CssProcessorEnum, TemplateOptions } from '@lania-cli/types';

const content = `
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    }
}`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/postcss.config.cjs',
    hide: options.cssProcessor !== CssProcessorEnum.tailwindcss,
});
