import { RunnerRunOptions } from '@lania-cli/types';
import { $ } from 'execa';

import {
    PackageManagerCommandFlags,
    PackageManagerCommands,
    PackageManagerName,
} from '@lania-cli/types';
import { readFile } from 'fs/promises';

class BaseRunner {
    public async run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return new Promise((resolve: (value: string) => void, reject) => {
            const { silent = true, cwd } = options;
            const $$ = $({
                shell: true,
                stdio: silent ? 'pipe' : 'inherit',
                cwd: cwd || process.cwd(),
            });
            const childProcess = $$`${command} ${args.join(' ')}`;
            let message = '';
            if (silent) {
                childProcess.stdout.on('data', (data: Buffer) => {
                    message += data.toString().replace(/\r\n|\n/, '\n');
                });
                childProcess.stderr.on('data', (data: Buffer) => {
                    message += data.toString().replace(/\r\n|\n|\r/, '\n');
                });
            }
            childProcess.on('error', (err) => {
                return reject(err);
            });
            childProcess.on('close', (code) => {
                if (code === 0) {
                    return resolve(silent ? message : null);
                }
                const commandAndArgs = `${command}${args?.length ? ` ${args.join(' ')}` : ''}`;
                const errMsg = silent ? `, from error message: "${message.trimEnd()}"` : '';
                return reject(new Error(`Failed to execute command: ${commandAndArgs}${errMsg}`));
            });
        });
    }
}

export abstract class Runner<Command extends string> {
    private command: Command;
    private runner = new BaseRunner();
    constructor(command: Command) {
        this.command = command;
    }
    protected run(action: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return this.runner.run(`${this.command} ${action}`, args, options);
    }
}

export abstract class PackageManager<Command extends PackageManagerName> extends Runner<Command> {
    private actions: PackageManagerCommands;
    private flags: PackageManagerCommandFlags;
    private registry: string;
    constructor(
        name: Command,
        actions: PackageManagerCommands,
        flags: PackageManagerCommandFlags,
        registry = 'https://registry.npmmirror.com',
    ) {
        super(name);
        this.actions = actions;
        this.flags = flags;
        this.registry = registry;
    }

    private async getPackageJsonContent() {
        return JSON.parse(await readFile(`${process.cwd()}/package.json`, 'utf-8'));
    }

    public async install(options: RunnerRunOptions = {}) {
        return await this.run(this.actions.install, [this.flags.initFlag], options);
    }

    public async init(options: RunnerRunOptions = {}) {
        return await this.run(this.actions.init, [this.flags.initFlag], options);
    }

    private async add(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        return await this.run(this.actions.install, [...dependencies, flag], options);
    }

    public addWithProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(dependencies, this.flags.saveFlag, options);
    }

    public addWithDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(devDependencies, this.flags.saveDevFlag, options);
    }

    public async version(options: RunnerRunOptions = {}) {
        return await this.run('--version', [], options);
    }

    private async update(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        return await this.run(this.actions.update, [...dependencies, flag, this.registry], options);
    }

    public async updateWithProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(dependencies, this.flags.saveFlag, options);
    }

    public async updateWithDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(devDependencies, this.flags.saveDevFlag, options);
    }

    public async remove(dependencies: string[], options: RunnerRunOptions = {}) {
        return await this.run(this.actions.remove, dependencies, options);
    }

    public async upgradeWithProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        const data1 = await this.remove(dependencies, options);
        const data2 = await this.addWithProduction(dependencies, options);
        return data1 + data2;
    }

    public async upgradeWithDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        const data1 = await this.remove(devDependencies, options);
        const data2 = await this.addWithDevelopment(devDependencies, options);
        return data1 + data2;
    }

    public async getDependencies() {
        return (await this.getPackageJsonContent()).dependencies;
    }

    public async getDevDependencies() {
        return (await this.getPackageJsonContent()).devDependencies;
    }

    public async getAllDependencies() {
        const dependencies = await this.getDependencies();
        const devDependencies = await this.getDevDependencies();
        return [...dependencies, ...devDependencies];
    }

    public async runScript(scriptName: string, scriptArgs: string[] = []) {
        const pkg = await this.getPackageJsonContent();
        if (!pkg.scripts || !pkg.scripts[scriptName]) {
            throw new Error(
                `Script "${scriptName}" not found in package.json. Available scripts: ${
                    Object.keys(pkg.scripts || {}).join(', ') || 'none'
                }`,
            );
        }
        const args = ['run', scriptName, ...(scriptArgs.length ? ['--', ...scriptArgs] : [])];
        return await this.run('', args);
    }

    public async isInstalled() {
        try {
            const version = await this.version();
            return !!version;
        } catch (e) {
            return false;
        }
    }
}
