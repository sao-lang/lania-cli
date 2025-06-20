type Plugin = Record<string, (...args: any[]) => any>;
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

function extractPluginMethods(instance: object): Plugin {
    const methods: Plugin = {};
    const proto = Object.getPrototypeOf(instance);

    for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor') continue;
        const value = (proto as any)[key];
        if (typeof value === 'function') {
            methods[key] = value.bind(instance);
        }
    }

    return methods;
}

export function WithPlugins<T extends object[]>(
    ...args: [...T] | [T[], PluginOptions?] | [...T, PluginOptions]
) {
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
                    const pluginMethods = isPlainObject(plugin)
                        ? (plugin as Plugin)
                        : extractPluginMethods(plugin);

                    for (const key of Object.keys(pluginMethods)) {
                        if (key in this) {
                            if (options.conflict === 'error') {
                                throw new Error(
                                    `Plugin conflict: "${key}" already exists on ${this.constructor.name}`,
                                );
                            } else if (options.conflict === 'warn') {
                                console.warn(
                                    `Warning: Plugin method "${key}" overrides existing method`,
                                );
                            } else if (options.conflict === 'rename') {
                                const newKey = `plugin_${key}`;
                                (this as any)[newKey] = pluginMethods[key];
                                continue;
                            }
                        }

                        (this as any)[key] = pluginMethods[key];
                    }
                }
            }
        };
    };
}

class A {
    sayHello() {}
}

@WithPlugins([new A()])
class B {}

const b = new B() as WithPluginInstance<typeof B, [A]>;;
b.sayHello();

