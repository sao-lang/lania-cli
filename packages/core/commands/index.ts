import pkgJsonContent from '../package.json';
import { SyncCommand } from '@lania-cli/command-sync';
import { DevCommand } from '@lania-cli/command-dev';
import { BuildCommand } from '@lania-cli/command-build';
import { LintCommand } from '@lania-cli/command-lint';
import { CreateCommand } from '@lania-cli/command-create';
import { AddCommand } from '@lania-cli/command-add';
import { registerCommands } from '@lania-cli/common';
registerCommands(pkgJsonContent.commandName, pkgJsonContent.version, [
    new CreateCommand(),
    new DevCommand(),
    new BuildCommand(),
    new LintCommand(),
    new AddCommand(),
    new SyncCommand(),
]);
