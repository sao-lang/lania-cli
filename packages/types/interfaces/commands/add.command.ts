import { AddCommandSupportTemplate } from '../../enum';

export interface AddCommandOptions {
    filepath?: string;
    template?: keyof {
        v2: AddCommandSupportTemplate.v2;
        v3: AddCommandSupportTemplate.v3;
        rcc: AddCommandSupportTemplate.rcc;
        rfc: AddCommandSupportTemplate.rfc;
        svelte: AddCommandSupportTemplate.svelte;
        jsx: AddCommandSupportTemplate.jsx;
        tsx: AddCommandSupportTemplate.tsx;
        astro: AddCommandSupportTemplate.astro;
        axios: AddCommandSupportTemplate.axios;
        router: AddCommandSupportTemplate.router;
        store: AddCommandSupportTemplate.store;
        prettier: AddCommandSupportTemplate.prettier;
        eslint: AddCommandSupportTemplate.eslint;
        stylelint: AddCommandSupportTemplate.stylelint;
        editorconfig: AddCommandSupportTemplate.editorconfig;
        gitignore: AddCommandSupportTemplate.gitignore;
        tsconfig: AddCommandSupportTemplate.tsconfig;
        commitlint: AddCommandSupportTemplate.commitlint;
        commitizen: AddCommandSupportTemplate.commitizen;
    };
    name?: string
}
