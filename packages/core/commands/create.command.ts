import { PACKAGE_TOOLS } from '@lania-cli/common';
import GitRunner from '@runners/git.runner';
import { mkdir, readdir } from 'fs/promises';
import path from 'path';
import { Builder } from 'templates/builder';
import validatePkgName from 'validate-npm-package-name';
import { LaniaCommand, LaniaCommandActionInterface } from './command.base';

export interface CreateCommandOptions {
    name: string;
    directory: string;
    skipInstall: boolean;
    skipGit: boolean;
    language: boolean;
    packageManager: string;
}

type CreateActionOptions = Exclude<CreateCommandOptions, 'name'>;

class CreateAction implements LaniaCommandActionInterface<[string, CreateCommandOptions]> {
    private options: CreateCommandOptions = {} as any;
    private validateProjectName(name: string) {
        return !validatePkgName(name).errors;
    }
    private async check(name: string, directory: string, packageManager: string) {
        const cwd = process.cwd();
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
                message: 'Invalid project name: ${this.options.name}',
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
    public async handle(name: string, command: CreateActionOptions) {
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

export default class CreateCommand extends LaniaCommand<[string, CreateCommandOptions]> {
    protected actor = new CreateAction();
    protected commandNeededArgs = {
        name: 'create [name]',
        description: 'Generate an application.',
        options: [
            {
                flags: '-d, --directory [directory]',
                description: 'Specify the destination directory.',
            },
            {
                flags: '-g, --skip-git',
                description: 'Skip git repository initialization.',
                defaultValue: false,
            },
            {
                flags: '-s, --skip-install',
                description: 'Skip package installation.',
                defaultValue: false,
            },
            {
                flags: '-p, --package-manager [packageManager]',
                description: 'Specify package manager.',
            },
            {
                flags: '-l, --language [language]',
                description: 'Programming language to be used (TypeScript or JavaScript).',
                defaultValue: 'TypeScript',
            },
        ],
        alias: '-c',
    };
}
