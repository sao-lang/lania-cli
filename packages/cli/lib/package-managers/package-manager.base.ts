import Runner, { type RunnerRunOptions } from '@runners/runner.base';
import to from '@utils/to';
import { readFile } from 'fs/promises';

export interface PackageManagerCommandFlags {
    saveFlag: string;
    saveDevFlag: string;
    silentFlag: string;
    initFlag: string;
}

export interface PackageManagerCommands {
    install: string;
    add: string;
    update: string;
    remove: string;
    init: string;
}

export type PackageManagerName = 'npm' | 'yarn' | 'pnpm';

export default class PackageManager {
    private runner: Runner;
    private name: PackageManagerName;
    private commands: PackageManagerCommands;
    private flags: PackageManagerCommandFlags;
    private registry: string;
    constructor(
        name: PackageManagerName,
        commands: PackageManagerCommands,
        flags: PackageManagerCommandFlags,
        registry = 'https://registry.npmmirror.com',
    ) {
        this.name = name;
        this.commands = commands;
        this.flags = flags;
        this.runner = new Runner();
        this.registry = registry;
    }

    private run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        return this.runner.run(`${this.name} ${command}`, args, options);
    }

    private async getPackageJsonContent() {
        const [readErr, content] = await to(readFile(`${process.cwd()}/package.json`, 'utf-8'));
        if (readErr) {
            throw readErr;
        }
        return content;
    }

    public async install(options: RunnerRunOptions = {}) {
        const [err, data] = await to(this.run(this.commands.init, [this.flags.initFlag], options));
        if (err) {
            throw err;
        }
        return data;
    }

    public async init(options: RunnerRunOptions = {}) {
        const [err, data] = await to(this.run(this.commands.init, [this.flags.initFlag], options));
        if (err) {
            throw err;
        }
        return data;
    }

    private async add(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        const [err, data] = await to(
            this.runner.run(this.commands.install, [...dependencies, flag], options),
        );
        if (err) {
            throw err;
        }
        return data;
    }

    public addInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(dependencies, this.flags.saveFlag, options);
    }

    public addInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(devDependencies, this.flags.saveDevFlag, options);
    }

    public async version(options: RunnerRunOptions = {}) {
        const [err, data] = await to(this.run('--version', [], options));
        if (err) {
            throw err;
        }
        return data;
    }

    private async update(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        const [err, data] = await to(
            this.run(this.commands.update, [...dependencies, flag, this.registry], options),
        );
        if (err) {
            throw err;
        }
        return data;
    }

    public async updateInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(dependencies, this.flags.saveFlag, options);
    }

    public async updateInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(devDependencies, this.flags.saveDevFlag, options);
    }

    public async remove(dependencies: string[], options: RunnerRunOptions = {}) {
        const [err, data] = await to(this.run(this.commands.remove, dependencies, options));
        if (err) {
            throw err;
        }
        return data;
    }

    public async upgradeInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        const [removeErr, data1] = await to(this.remove(dependencies, options));
        if (removeErr) {
            throw removeErr;
        }
        const [addErr, data2] = await to(this.addInProduction(dependencies, options));
        if (addErr) {
            throw addErr;
        }
        return data1 + data2;
    }

    public async upgradeInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        const [removeErr, data1] = await to(this.remove(devDependencies, options));
        if (removeErr) {
            throw removeErr;
        }
        const [addErr, data2] = await to(this.addInDevelopment(devDependencies, options));
        if (addErr) {
            throw addErr;
        }
        return data1 + data2;
    }

    public async getDependencies() {
        const [err, content] = await to(this.getPackageJsonContent());
        if (err) {
            throw err;
        }
        return JSON.parse(content).dependencies;
    }

    public async getDevDependencies() {
        const [err, content] = await to(this.getPackageJsonContent());
        if (err) {
            throw err;
        }
        return JSON.parse(content).devDependencies;
    }
}
