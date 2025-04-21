import pkgJsonContent from './package.json';
import { DevCommand } from './command';
import { registerCommands } from '@lania-cli/common';
registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new DevCommand()]);

export * from './command';
