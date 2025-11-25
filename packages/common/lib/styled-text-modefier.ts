import { HSL, RGB, StyleFlags, StyleOptions } from '@lania-cli/types';
import chalk from 'chalk';

const STYLE_FLAGS = {
    bold: 'bold',
    italic: 'italic',
    underline: 'underline',
    overline: 'overline',
    inverse: 'inverse',
    strikethrough: 'strikethrough',
    visible: 'visible',
    hidden: 'hidden',
} as const;

// 移除对 Alpha 通道的捕获，因为 chalk 不支持终端透明度
const COLOR_REGEX = {
    RGB: /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i, // 简化为 RGB
    HSL: /^hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)$/i, // 简化为 HSL
};

class ColorParser {
    static rgbToHex(r: number, g: number, b: number): string {
        const component = (c: number) =>
            Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
        return `#${component(r)}${component(g)}${component(b)}`;
    }

    // ⭐️ 优化点 1: 使用更标准、易读的 HSL 到 RGB 转换
    static hslToRgb({ h, s, l }: HSL): RGB {
        const hue2rgb = (p: number, q: number, t: number): number => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const H = h / 360;
        const S = s / 100;
        const L = l / 100;

        let r: number, g: number, b: number;

        if (S === 0) {
            r = g = b = L; // achromatic (灰色)
        } else {
            const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
            const p = 2 * L - q;
            r = hue2rgb(p, q, H + 1 / 3);
            g = hue2rgb(p, q, H);
            b = hue2rgb(p, q, H - 1 / 3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255),
        };
    }

    static parse(color: string): string {
        if (color.startsWith('#')) return color;

        const rgbMatch = color.match(COLOR_REGEX.RGB);
        if (rgbMatch) {
            const [, r, g, b] = rgbMatch.map(Number);
            // ⭐️ 优化点 2: 移除对 Alpha 通道的处理
            return this.rgbToHex(r, g, b);
        }

        const hslMatch = color.match(COLOR_REGEX.HSL);
        if (hslMatch) {
            const [, h, s, l] = hslMatch.map(Number);
            const rgb = this.hslToRgb({ h, s, l });
            // ⭐️ 优化点 2: 移除对 Alpha 通道的处理
            return this.rgbToHex(rgb.r, rgb.g, rgb.b);
        }

        // 如果不是标准格式，直接返回原字符串，让 chalk 尝试解析
        return color;
    }
}

export class StyledTextModefier {
    // 将 chain 初始化为 undefined，表示需要构建
    private chain: ((text: string) => string) | undefined;
    private _options: StyleOptions;

    constructor(
        private content: string,
        options: StyleOptions = {},
    ) {
        this._options = { ...options };
        // 构造函数不再调用 createStyleFunction，延迟构建
    }

    private createStyleFunction(): (text: string) => string {
        const styles: ((text: string) => string)[] = [];

        // 处理颜色
        if (this._options.color) {
            const color = ColorParser.parse(this._options.color);
            styles.push((text) => chalk.hex(color)(text));
        }

        // 处理背景色
        if (this._options.bgColor) {
            const bgColor = ColorParser.parse(this._options.bgColor);
            styles.push((text) => chalk.bgHex(bgColor)(text));
        }

        // 处理样式标志
        for (const key in STYLE_FLAGS) {
            if (this._options[key as keyof StyleOptions]) {
                const method = STYLE_FLAGS[key as keyof typeof STYLE_FLAGS];
                styles.push((text) => chalk[method](text));
            }
        }

        // 灰度处理
        if (
            typeof this._options.dimLevel === 'number' &&
            this._options.dimLevel >= 1 &&
            this._options.dimLevel <= 10
        ) {
            const level = this._options.dimLevel;
            const gray = 255 - Math.floor((level / 10) * 255);
            const hex = ColorParser.rgbToHex(gray, gray, gray);
            styles.push((text) => chalk.hex(hex)(text));
        }

        return (text: string) => {
            try {
                return styles.reduce((result, style) => style(result), text);
            } catch {
                return text;
            }
        };
    }

    // ⭐️ 优化点 3: 静态缓存，但调用时不重建 chain
    private static _chainMethods?: Record<keyof StyleFlags, () => StyledTextModefier>;

    static getChainMethods(): Record<keyof StyleFlags, () => StyledTextModefier> {
        if (!this._chainMethods) {
            this._chainMethods = {} as Record<keyof StyleFlags, () => StyledTextModefier>;
            for (const key of Object.keys(STYLE_FLAGS) as Array<keyof StyleFlags>) {
                this._chainMethods[key] = function (this: StyledTextModefier) {
                    if (!this._options) this._options = {};
                    this._options[key] = true;
                    // ⭐️ 优化点 4: 移除 ensureChainInitialized() 调用，避免重复构建
                    this.chain = undefined; // 标记为需要重建
                    return this;
                };
            }
        }
        return this._chainMethods;
    }

    private ensureChainInitialized(): void {
        // 仅在 chain 未定义时才构建
        if (typeof this.chain !== 'function') {
            this.chain = this.createStyleFunction();
        }
    }

    public config(options: Partial<StyleOptions>): StyledTextModefier {
        this._options = { ...this._options, ...options };
        // 标记为需要重建
        this.chain = undefined;
        return this;
    }

    public render() {
        // ⭐️ 优化点 5: 在 render 时保证 chain 被构建
        this.ensureChainInitialized();
        const { prefix = '', suffix = '' } = this._options;
        const text = `${prefix}${this.content}${suffix}`;

        // 此时 this.chain 必然是 function
        return (this.chain as (text: string) => string)(text);
    }
}
