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
        this.registry = registry;
    }

    private run(command: string, args: string[] = [], options: RunnerRunOptions = {}) {
        const runner = new Runner();
        return runner.run(`${this.name} ${command}`, args, options);
    }

    private async getPackageJsonContent() {
        return JSON.parse(await readFile(`${process.cwd()}/package.json`, 'utf-8'));
    }

    public async install(options: RunnerRunOptions = {}) {
        return await this.run(this.commands.install, [this.flags.initFlag], options);
    }

    public async init(options: RunnerRunOptions = {}) {
        return await this.run(this.commands.init, [this.flags.initFlag], options);
    }

    private async add(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        return await this.run(this.commands.install, [...dependencies, flag], options);
    }

    public addInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(dependencies, this.flags.saveFlag, options);
    }

    public addInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.add(devDependencies, this.flags.saveDevFlag, options);
    }

    public async version(options: RunnerRunOptions = {}) {
        return await this.run('--version', [], options);
    }

    private async update(dependencies: string[], flag: string, options: RunnerRunOptions = {}) {
        return await this.run(
            this.commands.update,
            [...dependencies, flag, this.registry],
            options,
        );
    }

    public async updateInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(dependencies, this.flags.saveFlag, options);
    }

    public async updateInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(devDependencies, this.flags.saveDevFlag, options);
    }

    public async remove(dependencies: string[], options: RunnerRunOptions = {}) {
        return await this.run(this.commands.remove, dependencies, options);
    }

    public async upgradeInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        const data1 = await this.remove(dependencies, options);
        const data2 = await this.addInProduction(dependencies, options);
        return data1 + data2;
    }

    public async upgradeInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        const data1 = await this.remove(devDependencies, options);
        const data2 = await this.addInDevelopment(devDependencies, options);
        return data1 + data2;
    }

    public async getDependencies() {
        return (await this.getPackageJsonContent()).dependencies;
    }

    public async getDevDependencies() {
        return (await this.getPackageJsonContent()).devDependencies;
    }
}
