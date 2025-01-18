import { TemplateOptions } from '../..';
const content = `
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/tailwind.css',
    hide: options.cssProcessor !== 'tailwindcss',
});
