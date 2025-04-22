import pkgJsonContent from './package.json';
import { SyncCommand } from './command';
import { registerCommands } from '@lania-cli/common';
export const register = () =>
    registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new SyncCommand()]);

export * from './command';
