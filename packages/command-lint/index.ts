import pkgJsonContent from './package.json';
import { LintCommand } from './command';
import { registerCommands } from '@lania-cli/common';
export const register = () =>
    registerCommands(pkgJsonContent.commandName, pkgJsonContent.version, [new LintCommand()]);

export * from './command';
