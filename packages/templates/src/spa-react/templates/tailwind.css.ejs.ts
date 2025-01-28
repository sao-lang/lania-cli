import { CssProcessorEnum, TemplateOptions } from '@lania-cli/types';
const content = `
@tailwind base;
@tailwind components;
@tailwind utilities;
`;

export default (options: TemplateOptions) => ({
    content,
    outputPath: '/tailwind.css',
    hide: options.cssProcessor !== CssProcessorEnum.tailwindcss,
});
