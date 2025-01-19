import {
    PackageManagerCommandFlags,
    PackageManagerCommands,
    PackageManagerName,
    RunnerRunOptions,
} from '@lania-cli/types';
import Runner from '@runners/runner.base';
import { readFile } from 'fs/promises';

export default abstract class PackageManager<
    Command extends PackageManagerName,
> extends Runner<Command> {
    protected command: Command;
    private actions: PackageManagerCommands;
    private flags: PackageManagerCommandFlags;
    private registry: string;
    constructor(
        name: Command,
        actions: PackageManagerCommands,
        flags: PackageManagerCommandFlags,
        registry = 'https://registry.npmmirror.com',
    ) {
        super();
        this.command = name;
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
        return await this.run(this.actions.update, [...dependencies, flag, this.registry], options);
    }

    public async updateInProduction(dependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(dependencies, this.flags.saveFlag, options);
    }

    public async updateInDevelopment(devDependencies: string[], options: RunnerRunOptions = {}) {
        return this.update(devDependencies, this.flags.saveDevFlag, options);
    }

    public async remove(dependencies: string[], options: RunnerRunOptions = {}) {
        return await this.run(this.actions.remove, dependencies, options);
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
