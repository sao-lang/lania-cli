import { PACKAGE_TOOLS } from '@lib/constants/cli.constant';
import GitRunner from '@runners/git.runner';
import logger from '@utils/logger';
import to from '@utils/to';
import { type Command } from 'commander';
import { mkdir, readdir } from 'fs/promises';
import path from 'path';
import { Builder } from 'templates/builder';
import validatePkgName from 'validate-npm-package-name';

export interface CommandCreateOptions {
    name: string;
    directory: string;
    skipInstall: boolean;
    skipGit: boolean;
    language: boolean;
    packageManager: string;
}

type CommandActionOptions = Exclude<CommandCreateOptions, 'name'>;

const cwd = process.cwd();

class CreateAction {
    private options: CommandCreateOptions = {} as any;
    private validateProjectName(name: string) {
        return !validatePkgName(name).errors;
    }
    private async check(name: string, directory: string, packageManager: string) {
        if (packageManager && !PACKAGE_TOOLS.includes(packageManager)) {
            return {
                status: false,
                message: 'Invalid package manager!',
            };
        }
        if (name === '.' || !name) {
            this.options.name = path.basename(process.cwd());
            if (!this.validateProjectName(this.options.name)) {
                return {
                    status: false,
                    message: `Invalid project name: ${this.options.name}`,
                };
            }
            if (directory) {
                this.options.directory = directory;
                await mkdir(`${cwd}/${directory}`, { recursive: true });
                return {
                    status: true,
                    message: '',
                };
            }
            const files = await readdir(cwd, { encoding: 'utf-8' });
            if (files.length > 0) {
                return {
                    status: false,
                    message: 'Please make sure there are no files in the current directory!',
                };
            }
            return {
                status: true,
                message: '',
            };
        }
        if (!this.validateProjectName(name)) {
            return {
                status: false,
                message: 'Invalid project name!',
            };
        }
        this.options.name = name;
        this.options.directory = directory || name;
        await mkdir(`${cwd}/${this.options.directory}`, { recursive: true });
        return {
            status: true,
            message: '',
        };
    }
    public async handle(name: string, command: CommandActionOptions) {
        this.options = { name, ...command };
        const { status, message } = await this.check(
            name,
            command.directory,
            command.packageManager,
        );
        if (!status) {
            throw new Error(message);
        }
        await new Builder().build({ name, ...this.options });
        if (!command.skipGit) {
            await new GitRunner().init({ silent: true });
        }
    }
}

export default class CreateCommand {
    public load(program: Command) {
        program
            .command('create [name]')
            .description('Generate an application.')
            .option('-d, --directory [directory]', 'Specify the destination directory.')
            .option('-g, --skip-git', 'Skip git repository initialization.', false)
            .option('-s, --skip-install', 'Skip package installation.', false)
            .option('-p, --package-manager [packageManager]', 'Specify package manager.')
            .option(
                '-l, --language [language]',
                'Programming language to be used (TypeScript or JavaScript).',
                'TypeScript',
            )
            .alias('-c')
            .action(async (name, command: CommandActionOptions) => {
                const [handleErr] = await to(new CreateAction().handle(name, command));
                if (handleErr) {
                    logger.error(handleErr.message, true);
                }
            });
    }
}
