import { AnyPlugin, IPluginContainer } from '@lania-cli/types';

export class PluginManager implements IPluginContainer {
    private plugins = new Map<string, AnyPlugin>();

    public register(name: string, plugin: AnyPlugin): void {
        this.plugins.set(name, plugin);
    }

    public get<T extends AnyPlugin>(name: string): T {
        const plugin = this.plugins.get(name);
        if (!plugin) {
            throw new Error(`Plugin "${name}" not registered.`);
        }
        return plugin as T;
    }
}
