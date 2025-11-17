import type { RollupOptions, OutputOptions } from 'rollup';
import type { UserConfig as ViteUserConfig } from 'vite';

/** 支持普通对象或函数形式配置 */
type MaybeFn<T> = T | ((...args: any[]) => T);

function isObject(v: any): v is Record<string, any> {
    return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeArray<T>(a?: T[], b?: T[]): T[] {
    return Array.from(new Set([...(a || []), ...(b || [])]));
}
// eslint-disable-next-line @typescript-eslint/ban-types
function mergeFunction(a?: Function, b?: Function) {
    if (a && b) {
        return (...args: any[]) => {
            try {
                a(...args);
            } catch (e) {
                /* ignore */
            }
            try {
                b(...args);
            } catch (e) {
                /* ignore */
            }
        };
    }
    return a || b;
}
function uniqBy<T>(arr: T[], keyFn: (it: T) => string) {
    const map = new Map<string, T>();
    arr.forEach((it) => map.set(keyFn(it), it));
    return Array.from(map.values());
}

/* -------------------- Rollup-specific -------------------- */
function mergeExternal(a: any, b: any) {
    if (!a) return b;
    if (!b) return a;
    const norm = (v: any) => {
        if (typeof v === 'function') return v;
        if (Array.isArray(v)) return v;
        return [v];
    };
    const A = norm(a);
    const B = norm(b);

    if (typeof A === 'function' && typeof B === 'function') {
        return (id: string, importer?: string, isResolved?: boolean) =>
            Boolean(A(id, importer, isResolved) || B(id, importer, isResolved));
    }
    if (typeof A === 'function') {
        return (id: string, importer?: string, isResolved?: boolean) =>
            Boolean(A(id, importer, isResolved) || (B as any).includes?.(id));
    }
    if (typeof B === 'function') {
        return (id: string, importer?: string, isResolved?: boolean) =>
            Boolean(B(id, importer, isResolved) || (A as any).includes?.(id));
    }
    return mergeArray(A, B);
}

function deepMerge(a: any, b: any): any {
    if (!isObject(a) || !isObject(b)) return b ?? a;
    const out: any = { ...a };
    for (const k of Object.keys(b)) {
        const av = a[k];
        const bv = b[k];

        if (Array.isArray(av) || Array.isArray(bv)) {
            out[k] = mergeArray(av, bv);
        } else if (typeof av === 'function' || typeof bv === 'function') {
            out[k] = mergeFunction(av, bv);
        } else if (isObject(av) && isObject(bv)) {
            out[k] = deepMerge(av, bv);
        } else {
            out[k] = bv;
        }
    }
    return out;
}

function mergeOutput(a?: OutputOptions | OutputOptions[], b?: OutputOptions | OutputOptions[]) {
    if (!a) return b;
    if (!b) return a;
    const A = Array.isArray(a) ? a : [a];
    const B = Array.isArray(b) ? b : [b];
    const max = Math.max(A.length, B.length);
    const out: OutputOptions[] = [];
    for (let i = 0; i < max; i++) {
        out.push(deepMerge(A[i] || {}, B[i] || {}));
    }
    return out.length === 1 ? out[0] : out;
}

/**
 * mergeRollupConfig:
 * - 支持 base/overrides 为对象或函数；
 * - 返回 MaybeFn<RollupOptions>
 */
export function mergeRollupConfig(
    base: MaybeFn<RollupOptions>,
    overrides: MaybeFn<RollupOptions>,
): MaybeFn<RollupOptions> {
    // 如果任一是函数：返回新的函数（延迟执行）
    if (typeof base === 'function' || typeof overrides === 'function') {
        return (...args: any[]) => {
            const A = typeof base === 'function' ? (base as any)(...args) : base;
            const B = typeof overrides === 'function' ? (overrides as any)(...args) : overrides;
            // 此处 A,B 都是 RollupOptions 对象，递归调用具体合并逻辑
            return mergeRollupConfig(A || {}, B || {}) as RollupOptions;
        };
    }

    const result: any = { ...(base as RollupOptions) };

    for (const key of Object.keys(overrides as RollupOptions) as (keyof RollupOptions)[]) {
        const av = (base as any)[key];
        const bv = (overrides as any)[key];

        switch (key) {
            case 'input':
                if (!av) result.input = bv;
                else if (Array.isArray(av) || Array.isArray(bv)) {
                    result.input = mergeArray(
                        Array.isArray(av) ? av : [av],
                        Array.isArray(bv) ? bv : [bv],
                    );
                } else if (isObject(av) && isObject(bv)) {
                    result.input = { ...av, ...bv };
                } else {
                    result.input = bv;
                }
                break;

            case 'output':
                result.output = mergeOutput(av, bv);
                break;

            case 'external':
                result.external = mergeExternal(av, bv);
                break;

            case 'plugins':
                result.plugins = [...(av || []), ...(bv || [])];
                break;

            case 'onwarn':
                result.onwarn = mergeFunction(av, bv) as any;
                break;

            default:
                if (Array.isArray(av) || Array.isArray(bv)) result[key] = mergeArray(av, bv);
                else if (typeof av === 'function' || typeof bv === 'function')
                    result[key] = mergeFunction(av, bv);
                else if (isObject(av) && isObject(bv)) result[key] = deepMerge(av, bv);
                else result[key] = bv;
        }
    }

    return result as RollupOptions;
}

/* -------------------- Vite-specific -------------------- */
/** 返回 MaybeFn<ViteUserConfig> */
export function mergeViteConfig(
    base: MaybeFn<ViteUserConfig>,
    overrides: MaybeFn<ViteUserConfig>,
): MaybeFn<ViteUserConfig> {
    if (typeof base === 'function' || typeof overrides === 'function') {
        return (...args: any[]) => {
            const A = typeof base === 'function' ? (base as any)(...args) : base;
            const B = typeof overrides === 'function' ? (overrides as any)(...args) : overrides;
            return mergeViteConfig(A || {}, B || {}) as ViteUserConfig;
        };
    }

    const result: any = { ...(base as ViteUserConfig) };

    for (const key of Object.keys(overrides as ViteUserConfig) as (keyof ViteUserConfig)[]) {
        const av = (base as any)[key];
        const bv = (overrides as any)[key];

        switch (key) {
            case 'plugins':
                result.plugins = [...(av || []), ...(bv || [])];
                break;

            case 'define':
                result.define = { ...(av || {}), ...(bv || {}) };
                break;

            case 'resolve':
            case 'server':
            case 'preview':
            case 'optimizeDeps':
            case 'ssr':
            case 'worker':
                result[key] = deepMerge(av || {}, bv || {});
                break;

            case 'build': {
                const baseBuild = av || {};
                const newBuild = bv || {};
                const mergedBuild = deepMerge(baseBuild, newBuild);
                if ((baseBuild as any).rollupOptions || (newBuild as any).rollupOptions) {
                    mergedBuild.rollupOptions = mergeRollupConfig(
                        (baseBuild as any).rollupOptions || {},
                        (newBuild as any).rollupOptions || {},
                    );
                }
                result.build = mergedBuild;
                break;
            }

            default:
                if (Array.isArray(av) || Array.isArray(bv)) result[key] = mergeArray(av, bv);
                else if (typeof av === 'function' || typeof bv === 'function')
                    result[key] = mergeFunction(av, bv);
                else if (isObject(av) && isObject(bv)) result[key] = deepMerge(av, bv);
                else result[key] = bv;
        }
    }

    return result as ViteUserConfig;
}

/* -------------------- Webpack-specific -------------------- */
function mergeWebpackRules(a: any[] = [], b: any[] = []) {
    const rules = [...a];
    for (const rb of b) {
        const key = rb.test?.toString() || JSON.stringify(rb);
        const idx = rules.findIndex((ra) => (ra.test?.toString?.() || JSON.stringify(ra)) === key);
        if (idx === -1) rules.push(rb);
        else rules[idx] = deepMerge(rules[idx], rb);
    }
    return rules;
}
function mergeWebpackPlugins(a: any[] = [], b: any[] = []) {
    const all = [...a, ...b];
    return uniqBy(all.reverse(), (p: any) => p?.constructor?.name ?? JSON.stringify(p)).reverse();
}
function mergeWebpackEntry(a: any, b: any) {
    if (!a) return b;
    if (!b) return a;
    if (typeof a === 'string' && typeof b === 'string') return [a, b];
    if (typeof a === 'string' && Array.isArray(b)) return [a, ...b];
    if (Array.isArray(a) && typeof b === 'string') return [...a, b];
    if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
    if (isObject(a) && isObject(b)) {
        const out: any = { ...a };
        for (const k of Object.keys(b)) out[k] = mergeWebpackEntry(a[k], b[k]);
        return out;
    }
    return b;
}

/** 返回 MaybeFn<any>，因为 webpack 配置一般没有明显的 TS 类型 */
export function mergeWebpackConfig(base: MaybeFn<any>, overrides: MaybeFn<any>): MaybeFn<any> {
    if (typeof base === 'function' || typeof overrides === 'function') {
        return (...args: any[]) => {
            const A = typeof base === 'function' ? (base as any)(...args) : base;
            const B = typeof overrides === 'function' ? (overrides as any)(...args) : overrides;
            return mergeWebpackConfig(A || {}, B || {}) as any;
        };
    }

    function mergeObjects(a: any = {}, b: any = {}) {
        const out: any = { ...a };
        for (const key of Object.keys(b)) {
            const v1 = a[key];
            const v2 = b[key];

            if (key === 'module' && isObject(v1) && isObject(v2)) {
                out.module = {
                    ...v1,
                    ...v2,
                    rules: mergeWebpackRules(v1.rules || [], v2.rules || []),
                };
                continue;
            }

            if (key === 'plugins') {
                out.plugins = mergeWebpackPlugins(v1 || [], v2 || []);
                continue;
            }

            if (key === 'entry') {
                out.entry = mergeWebpackEntry(v1, v2);
                continue;
            }

            if (isObject(v1) && isObject(v2)) out[key] = mergeObjects(v1, v2);
            else if (Array.isArray(v1) && Array.isArray(v2)) out[key] = [...v1, ...v2];
            else out[key] = v2;
        }
        return out;
    }

    return mergeObjects(base || {}, overrides || {});
}

/* -------------------- Universal -------------------- */
export function mergeUniversalConfig(base: MaybeFn<any>, overrides: MaybeFn<any>): MaybeFn<any> {
    if (typeof base === 'function' || typeof overrides === 'function') {
        return (...args: any[]) => {
            const A = typeof base === 'function' ? (base as any)(...args) : base;
            const B = typeof overrides === 'function' ? (overrides as any)(...args) : overrides;
            return mergeUniversalConfig(A, B) as any;
        };
    }

    if (!isObject(base) || !isObject(overrides)) return overrides ?? base;

    const result: any = { ...base };
    for (const key of Object.keys(overrides)) {
        const av = base[key];
        const bv = overrides[key];

        if (Array.isArray(av) || Array.isArray(bv)) {
            result[key] = mergeArray(
                Array.isArray(av) ? av : av == null ? [] : [av],
                Array.isArray(bv) ? bv : bv == null ? [] : [bv],
            );
            continue;
        }
        if (typeof av === 'function' || typeof bv === 'function') {
            result[key] = mergeFunction(av, bv);
            continue;
        }
        if (isObject(av) && isObject(bv)) {
            result[key] = mergeUniversalConfig(av, bv);
            continue;
        }
        result[key] = bv;
    }

    return result;
}

/* -------------------- 统一入口 -------------------- */
export type ConfigKind = 'rollup' | 'vite' | 'webpack' | 'universal';

/** 返回类型为 MaybeFn<any>，调用方可按需检测是否为函数并调用 */
export function mergeConfig(
    base: MaybeFn<any>,
    overrides: MaybeFn<any>,
    kind?: ConfigKind,
): MaybeFn<any> {
    switch (kind) {
        case 'rollup':
            return mergeRollupConfig(base, overrides);
        case 'vite':
            return mergeViteConfig(base, overrides);
        case 'webpack':
            return mergeWebpackConfig(base, overrides);
        default:
            return mergeUniversalConfig(base, overrides);
    }
}
