import { createFilter } from '@rollup/pluginutils';
import { walk } from 'estree-walker';
import MagicString from 'magic-string';

/**
 * @param {Object<string, string|number|boolean|{ raw: string }>} replacements
 * @param {Object} [options]
 * @param {string|string[]} [options.include]
 * @param {string|string[]} [options.exclude]
 */
export function globalReplacePlugin(replacements, options = {}) {
    const filter = createFilter(options.include, options.exclude);

    return {
        name: 'custom-global-replace',

        transform(code, id) {
            if (!filter(id)) return null;

            const ast = this.parse(code);
            const s = new MagicString(code);

            walk(ast, {
                enter(node, parent) {
                    // 跳过不是 Identifier 的节点
                    if (node.type !== 'Identifier') return;

                    const name = node.name;
                    const replacement = replacements[name];
                    // 如果没有匹配到需要替换的变量，直接跳过
                    if (!Object.prototype.hasOwnProperty.call(replacements, name)) return;
                    if (replacement === undefined) return;

                    // 跳过对象的 key 或属性访问的 key（不替换对象中的键名）
                    if (
                        parent &&
                        ((parent.type === 'Property' && parent.key === node && !parent.computed) || // 对象的键名
                            (parent.type === 'MemberExpression' && parent.property === node && !parent.computed)) // 对象访问的属性名
                    ) {
                        return;
                    }

                    let replacementCode;

                    // 检查 replacement 是否为对象，并且有 'raw' 属性
                    if (
                        typeof replacement === 'object' &&
                        replacement !== null &&
                        Object.prototype.hasOwnProperty.call(replacement, 'raw')
                    ) {
                        if (typeof replacement.raw !== 'string') {
                            throw new Error(
                                `[globalReplacePlugin] "raw" replacement for "${name}" must be a string. Got: ${typeof replacement.raw}`,
                            );
                        }
                        replacementCode = replacement.raw;
                    } else {
                        // 替换成普通值，确保是字符串类型
                        try {
                            replacementCode = JSON.stringify(replacement);
                        } catch {
                            replacementCode = String(replacement);
                        }

                        if (typeof replacementCode !== 'string') {
                            throw new Error(
                                `[globalReplacePlugin] Replacement for "${name}" must resolve to a string. Got: ${typeof replacementCode}`,
                            );
                        }
                    }

                    // 执行替换
                    s.overwrite(node.start, node.end, replacementCode); // replacementCode 必须是 string
                },
            });

            return {
                code: s.toString(),
                map: s.generateMap({ hires: true }),
            };
        },
    };
}
