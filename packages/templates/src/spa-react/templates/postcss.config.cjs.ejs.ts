import { TemplateOptions } from '../..';

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
    hide: options.cssProcessor !== 'tailwindcss',
});
