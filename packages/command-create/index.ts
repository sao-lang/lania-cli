import pkgJsonContent from './package.json';
import { CreateCommand } from './command';
import { registerCommands } from '@lania-cli/common';
export const register = () =>
    registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new CreateCommand()]);

export * from './command';
