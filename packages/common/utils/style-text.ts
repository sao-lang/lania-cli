import type { StyleOptions } from '@lania-cli/types';
import { StyledTextModefier } from '../lib/styled-text-modefier';

const methods = StyledTextModefier.getChainMethods();
for (const key in methods) {
    StyledTextModefier.prototype[key] = methods[key];
}

export const styleText = (content: string, options?: StyleOptions) =>
    new StyledTextModefier(content, options);
