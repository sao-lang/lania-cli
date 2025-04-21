import pkgJsonContent from './package.json';
import { AddCommand } from './command';
import { registerCommands } from '@lania-cli/common';
registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new AddCommand()]);

export * from './command';
