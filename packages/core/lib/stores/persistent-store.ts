import Conf from 'conf';
import { EventEmitter } from 'events';
import { set, get, unset } from 'lodash-es';
import { z } from 'zod';

type FieldRule =
    | {
          type: 'string';
          minLength?: number;
          maxLength?: number;
          required?: boolean;
      }
    | {
          type: 'number';
          min?: number;
          max?: number;
          required?: boolean;
      }
    | {
          type: 'boolean';
          required?: boolean;
      }
    | {
          type: 'array';
          itemType: 'string' | 'number' | 'boolean' | 'object';
          minLength?: number;
          maxLength?: number;
          required?: boolean;
      }
    | {
          type: 'object';
          schema: Record<string, FieldRule>;
          required?: boolean;
      };

type SchemaShape = Record<string, FieldRule>;

export class PersistentStore extends EventEmitter {
    private diskStore: Conf;
    private expireMap: Map<string, number> = new Map();
    private defaultTTL: number | undefined;
    private typeSchemaMap: Map<string, z.ZodTypeAny> = new Map();

    constructor() {
        super();
        this.diskStore = new Conf({ projectName: 'my-cli', encryptionKey: 'my-secret-key' });
    }

    // 设置过期时间
    private setExpireTime(key: string, timestamp: number) {
        this.expireMap.set(key, timestamp);
    }

    // 判断键是否已过期
    private isExpired(key: string): boolean {
        const expiresAt = this.expireMap.get(key);
        return !!expiresAt && Date.now() > expiresAt;
    }

    // 校验数据类型
    private validateType(key: string, value: any) {
        const schema = this.typeSchemaMap.get(key);
        if (schema) {
            const result = schema.safeParse(value);
            if (!result.success) {
                throw new Error(`Validation failed for "${key}": ${result.error.message}`);
            }
        }
    }

    // 转换规则为Zod校验
    private toZodSchema(rule: FieldRule): z.ZodTypeAny {
        let baseSchema: z.ZodTypeAny;

        switch (rule.type) {
            case 'string': {
                let schema = z.string();
                if (rule.minLength !== undefined) schema = schema.min(rule.minLength);
                if (rule.maxLength !== undefined) schema = schema.max(rule.maxLength);
                baseSchema = schema;
                break;
            }
            case 'number': {
                let schema = z.number();
                if (rule.min !== undefined) schema = schema.min(rule.min);
                if (rule.max !== undefined) schema = schema.max(rule.max);
                baseSchema = schema;
                break;
            }
            case 'boolean': {
                baseSchema = z.boolean();
                break;
            }
            case 'array': {
                let itemSchema: z.ZodTypeAny;
                switch (rule.itemType) {
                    case 'string':
                        itemSchema = z.string();
                        break;
                    case 'number':
                        itemSchema = z.number();
                        break;
                    case 'boolean':
                        itemSchema = z.boolean();
                        break;
                    case 'object':
                        itemSchema = z.object({});
                        break;
                    default:
                        itemSchema = z.any();
                        break;
                }
                let schema = z.array(itemSchema);
                if (rule.minLength !== undefined) schema = schema.min(rule.minLength);
                if (rule.maxLength !== undefined) schema = schema.max(rule.maxLength);
                baseSchema = schema;
                break;
            }
            case 'object': {
                const shape: any = {};
                for (const [k, r] of Object.entries(rule.schema)) {
                    shape[k] = this.toZodSchema(r);
                }
                baseSchema = z.object(shape);
                break;
            }
            default:
                baseSchema = z.any();
        }

        // 统一处理是否 optional
        return rule.required === false ? baseSchema.optional() : baseSchema;
    }

    // 定义数据类型
    defineTypes(types: SchemaShape) {
        for (const [key, rule] of Object.entries(types)) {
            this.typeSchemaMap.set(key, this.toZodSchema(rule));
        }
    }

    // 设置值，支持路径字符串（如 'a.b.c'）并处理过期时间
    set<T = any>(key: string, value: T, options?: { ttl?: number }): void {
        if (this.isExpired(key)) this.delete(key);

        this.validateType(key, value);

        const oldValue = this.get(key);
        set(this.diskStore.store, key, value);

        // 设置过期时间
        const ttl = options?.ttl ?? this.defaultTTL;
        if (ttl) {
            const expiresAt = Date.now() + ttl;
            this.setExpireTime(key, expiresAt);
        }

        this.emitChange(key, value, oldValue);
    }

    // 获取值，支持路径字符串（如 'a.b.c'）
    get<T = any>(key: string): T | undefined {
        if (this.isExpired(key)) {
            this.delete(key);
            return undefined;
        }
        return get(this.diskStore.store, key);
    }

    // 删除值，支持路径字符串（如 'a.b.c'）
    delete(key: string): void {
        const oldValue = this.get(key);
        unset(this.diskStore.store, key);
        this.expireMap.delete(key);
        this.emitChange(key, undefined, oldValue);
    }

    // 刷新过期时间
    refreshExpireTime(key: string, ttl: number): void {
        const expiresAt = Date.now() + ttl;
        this.setExpireTime(key, expiresAt);
    }

    // 监听某个键的变化（支持路径字符串）
    onChange<T = any>(key: string, callback: (value: T, oldValue: T | undefined) => void): void {
        const pathRegex = new RegExp(`^${key.replace(/\./g, '\\.')}(\\.[a-zA-Z0-9_]+)*$`);

        this.on('change', (changedKey: string, value: T, oldValue: T | undefined) => {
            if (pathRegex.test(changedKey)) {
                callback(value, oldValue);
            }
        });
    }

    private emitChange<T>(key: string, value: T, oldValue: T | undefined) {
        if (value !== oldValue) {
            this.emit('change', key, value, oldValue);
        }
    }
}
