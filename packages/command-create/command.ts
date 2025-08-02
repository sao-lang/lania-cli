import { PACKAGES_MANAGERS, GitRunner, LaniaCommand, styleText, logger } from '@lania-cli/common';
import { mkdir, readdir } from 'fs/promises';
import path from 'path';
import { Builder } from './builder';
import validatePkgName from 'validate-npm-package-name';
import {
    CreateActionOptions,
    CreateCommandOptions,
    LaniaCommandActionInterface,
    PackageManagerEnum,
} from '@lania-cli/types';

class CreateAction implements LaniaCommandActionInterface<[CreateCommandOptions]> {
    private options: CreateCommandOptions = {} as any;
    private validateProjectName(name: string) {
        return !validatePkgName(name).errors;
    }
    private async check(name: string, directory: string, packageManager: string) {
        const cwd = process.cwd();
        if (packageManager && !PACKAGES_MANAGERS.includes(packageManager as PackageManagerEnum)) {
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
    public async handle(options: CreateActionOptions) {
        this.options = options;
        const { name, directory, packageManager, skipGit } = options;
        const { status, message } = await this.check(name, directory, packageManager);
        if (!status) {
            throw new Error(message);
        }
        await new Builder().build({ name, ...this.options });
        if (!skipGit) {
            await new GitRunner().git.init({ silent: true });
        }
        logger.ascii(`${options.name} CREATED`);
    }
}

export class CreateCommand extends LaniaCommand<[CreateCommandOptions]> {
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

export default CreateCommand;
