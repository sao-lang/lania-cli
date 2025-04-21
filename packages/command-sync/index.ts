import pkgJsonContent from './package.json';
import { SyncCommand } from './command';
import { registerCommands } from '@lania-cli/common';
registerCommands(pkgJsonContent.name, pkgJsonContent.version, [new SyncCommand()]);
