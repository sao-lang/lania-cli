import pkgJsonContent from './package.json';
import { BuildCommand } from './command';
import { registerCommands } from '@lania-cli/common';
registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new BuildCommand()]);

export * from './command';