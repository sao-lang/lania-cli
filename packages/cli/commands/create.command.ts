import { PACKAGE_TOOLS } from '@constants/index';
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
                    message: 'Invalid project name!',
                };
            }
            const [readdirErr, files] = await to(readdir(`${cwd}`, { encoding: 'utf-8' }));
            if (readdirErr) {
                return {
                    status: false,
                    message: readdirErr.message,
                };
            }
            if (files.length > 0) {
                return {
                    status: false,
                    message: 'Please make sure there are no files in the current directory!',
                };
            }
            if (directory) {
                this.options.directory = directory;
                const [mkdirErr] = await to(mkdir(`${cwd}/${directory}`, { recursive: true }));
                if (mkdirErr) {
                    return {
                        status: false,
                        message: mkdirErr.message,
                    };
                }
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
        const [mkdirErr] = await to(mkdir(`${cwd}/${this.options.directory}`, { recursive: true }));
        if (mkdirErr) {
            return {
                status: false,
                message: mkdirErr.message,
            };
        }
        return {
            status: true,
            message: '',
        };
    }
    public async handle(name: string, command: CommandActionOptions) {
        this.options = {
            name,
            ...command,
        };
        const {
            1: { status, message },
        } = await to(this.check(name, command.directory, command.packageManager));
        if (!status) {
            logger.error(message, true);
        }
        new Builder().build({ ...this.options, name });
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
                new CreateAction().handle(name, command);
            });
    }
}
