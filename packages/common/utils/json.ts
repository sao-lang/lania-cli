type JsonResult<T> = { ok: true; value: T } | { ok: false; error: Error };

export function safeJsonParse<T = unknown>(
    input: unknown,
    options?: {
        fallback?: T;
        reviver?: Parameters<typeof JSON.parse>[1];
        strict?: boolean;
        ensureObject?: boolean;
        validate?: (value: unknown) => value is T;
        default?: unknown
    },
): JsonResult<T> {
    try {
        if (typeof input !== 'string') {
            throw new Error('Input is not a string');
        }
        if (!input.trim()) {
            throw new Error('Empty JSON string');
        }

        const parsed = JSON.parse(input, options?.reviver);

        if (options?.ensureObject) {
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Parsed JSON is not an object');
            }
        }

        if (options?.validate && !options.validate(parsed)) {
            throw new Error('JSON validation failed');
        }

        return { ok: true, value: parsed as T };
    } catch (err) {
        if (options?.strict) {
            throw err;
        }

        if ('fallback' in (options ?? {})) {
            return { ok: true, value: options!.fallback as T };
        }

        return { ok: false, error: err as Error };
    }
}

export function safeJsonStringify(
    value: unknown,
    options?: {
        space?: number;
        fallback?: string;
        strict?: boolean;
        maxDepth?: number;
        circularValue?: string;
    },
): JsonResult<string> {
    const seen = new WeakSet<object>();
    const maxDepth = options?.maxDepth ?? Infinity;
    const circularValue = options?.circularValue ?? '[Circular]';

    function replacer(this: any, key: string, val: any) {
        const depth = this && typeof this === 'object' ? (this.__depth__ ?? 0) : 0;

        if (depth > maxDepth) {
            return '[MaxDepth]';
        }

        if (typeof val === 'bigint') {
            return val.toString();
        }

        if (typeof val === 'function' || typeof val === 'undefined') {
            return undefined;
        }

        if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) {
                return circularValue;
            }
            seen.add(val);
            Object.defineProperty(val, '__depth__', {
                value: depth + 1,
                enumerable: false,
                configurable: true,
            });
        }

        return val;
    }

    try {
        const str = JSON.stringify(value, replacer, options?.space);
        return { ok: true, value: str };
    } catch (err) {
        if (options?.strict) {
            throw err;
        }

        if ('fallback' in (options ?? {})) {
            return { ok: true, value: options!.fallback as string };
        }

        return { ok: false, error: err as Error };
    }
}
