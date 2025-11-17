import pkgJsonContent from './package.json';
import { AddCommand } from './command';
import { registerCommands } from '@lania-cli/common';
export const register = () =>
    registerCommands(pkgJsonContent.commandName, pkgJsonContent.version, [new AddCommand()]);
export * from './command';
