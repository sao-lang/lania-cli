import pkgJsonContent from './package.json';
import { ReleaseCommand } from './command';
import { registerCommands } from '@lania-cli/common';
export const register = () =>
    registerCommands(pkgJsonContent.commandName, pkgJsonContent.version, [new ReleaseCommand()]);
export * from './command';
