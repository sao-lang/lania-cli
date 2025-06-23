type Plugin = Record<string, any>;
type ConflictStrategy = 'error' | 'warn' | 'rename';

interface PluginOptions {
    conflict?: ConflictStrategy;
}

type ExtractInstanceMethods<T> = {
    [K in keyof T as T[K] extends (...args: any[]) => any ? K : never]: T[K];
};

type MergePluginInstances<T extends object[]> = T extends [infer First, ...infer Rest]
    ? ExtractInstanceMethods<First> & MergePluginInstances<Rest extends object[] ? Rest : []>
    : object;

export type WithPluginInstance<
    C extends new (...args: any[]) => any,
    T extends object[],
> = InstanceType<C> & MergePluginInstances<T>;

function isPlainObject(obj: any): obj is Plugin {
    return obj && obj.constructor === Object;
}

function extractPluginProperties(instance: object): Plugin {
    const result: Plugin = {};
    const proto = Object.getPrototypeOf(instance);

    // 原型上的方法 & getter/setter
    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor') continue;

        const descriptor = Object.getOwnPropertyDescriptor(proto, key);
        if (!descriptor) continue;

        if (typeof descriptor.value === 'function') {
            result[key] = descriptor.value.bind(instance);
        } else {
            Object.defineProperty(result, key, {
                get: descriptor.get?.bind(instance),
                set: descriptor.set?.bind(instance),
                enumerable: descriptor.enumerable,
                configurable: descriptor.configurable,
            });
        }
    }

    // 实例字段（非函数）
    for (const key of Object.keys(instance)) {
        if (!(key in result)) {
            result[key] = (instance as any)[key];
        }
    }

    return result;
}

export function WithPlugins<T extends object[]>(...args: [...T] | [T[], PluginOptions?] | [...T, PluginOptions]) {
    let plugins: object[] = [];
    let options: PluginOptions = { conflict: 'error' };

    if (Array.isArray(args[0])) {
        plugins = args[0] as object[];
        if (args[1]) options = args[1] as PluginOptions;
    } else {
        const last = args[args.length - 1];
        if (typeof last === 'object' && last && 'conflict' in last) {
            plugins = args.slice(0, -1) as object[];
            options = last as PluginOptions;
        } else {
            plugins = args as object[];
        }
    }

    return function <C extends new (...args: any[]) => any>(
        BaseClass: C,
    ): new (...args: ConstructorParameters<C>) => InstanceType<C> & MergePluginInstances<T> {
        return class extends BaseClass {
            constructor(...args: any[]) {
                super(...args);

                for (const plugin of plugins) {
                    const pluginProps = isPlainObject(plugin)
                        ? plugin
                        : extractPluginProperties(plugin);

                    for (const key of Object.keys(pluginProps)) {
                        const hasKey = key in this;
                        if (hasKey) {
                            if (options.conflict === 'error') {
                                throw new Error(`Plugin conflict: "${key}" already exists on ${this.constructor.name}`);
                            } else if (options.conflict === 'warn') {
                                console.warn(`Warning: Plugin property "${key}" overrides existing value`);
                            } else if (options.conflict === 'rename') {
                                const newKey = `plugin_${key}`;
                                (this as any)[newKey] = pluginProps[key];
                                continue;
                            }
                        }

                        (this as any)[key] = pluginProps[key];
                    }
                }
            }
        };
    };
}
