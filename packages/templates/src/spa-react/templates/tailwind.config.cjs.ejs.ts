import { CssProcessorEnum, TemplateOptions } from '@lania-cli/types';
const content = `
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/tailwind.config.cjs',
    hide: options.cssProcessor !== CssProcessorEnum.tailwindcss,
});
