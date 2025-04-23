import chalk from 'chalk';

type StyleFlags = {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    overline: boolean;
    inverse: boolean;
    strikethrough: boolean;
    visible: boolean;
    hidden: boolean;
};

type StyleOptions = {
    color?: string;
    bgColor?: string;
    prefix?: string;
    suffix?: string;
    dimLevel?: number;
} & Partial<StyleFlags>;

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

type RGB = { r: number; g: number; b: number };
type HSL = { h: number; s: number; l: number };

const COLOR_REGEX = {
    RGB: /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i,
    HSL: /^hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)$/i,
};

export class ColorParser {
    static rgbToHex(r: number, g: number, b: number): string {
        const component = (c: number) =>
            Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0');
        return `#${component(r)}${component(g)}${component(b)}`;
    }

    static hslToRgb({ h, s, l }: HSL): RGB {
        s /= 100;
        l /= 100;
        const k = (n: number) => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
        return {
            r: Math.round(255 * f(0)),
            g: Math.round(255 * f(8)),
            b: Math.round(255 * f(4)),
        };
    }

    static parse(color: string): string {
        if (color.startsWith('#')) return color;

        const rgbMatch = color.match(COLOR_REGEX.RGB);
        if (rgbMatch) {
            const [, r, g, b, a] = rgbMatch.map(Number);
            const hex = this.rgbToHex(r, g, b);
            return a ? `${hex}${Math.round(a * 255).toString(16)}` : hex;
        }

        const hslMatch = color.match(COLOR_REGEX.HSL);
        if (hslMatch) {
            const [, h, s, l, a] = hslMatch.map(Number);
            const rgb = this.hslToRgb({ h, s, l });
            const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
            return a ? `${hex}${Math.round(a * 255).toString(16)}` : hex;
        }

        return color;
    }
}

export class StyledText {
    private chain: (text: string) => string;
    private _options: StyleOptions;

    constructor(
        private content: string,
        options: StyleOptions = {},
    ) {
        this._options = { ...options };
        this.chain = this.createStyleFunction();
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
        if (typeof this._options.dimLevel === 'number' &&
            this._options.dimLevel >= 1 &&
            this._options.dimLevel <= 10) {
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

    private static _chainMethods?: Record<keyof StyleFlags, () => StyledText>;
    
    static getChainMethods(): Record<keyof StyleFlags, () => StyledText> {
        if (!this._chainMethods) {
            this._chainMethods = {} as Record<keyof StyleFlags, () => StyledText>;
            for (const key of Object.keys(STYLE_FLAGS) as Array<keyof StyleFlags>) {
                this._chainMethods[key] = function(this: StyledText) {
                    if (!this._options) this._options = {};
                    this._options[key] = true;
                    this.ensureChainInitialized();
                    return this;
                };
            }
        }
        return this._chainMethods;
    }

    private ensureChainInitialized(): void {
        if (typeof this.chain !== 'function') {
            this.chain = this.createStyleFunction();
        }
    }

    config(options: Partial<StyleOptions>): StyledText {
        this._options = { ...this._options, ...options };
        this.chain = this.createStyleFunction();
        return this;
    }

    render(): string {
        this.ensureChainInitialized();
        const { prefix = '', suffix = '' } = this._options;
        const text = `${prefix}${this.content}${suffix}`;
        return typeof this.chain === 'function'
            ? this.chain(text)
            : text;
    }
}

// Initialize prototype methods
const methods = StyledText.getChainMethods();
for (const key in methods) {
    StyledText.prototype[key] = methods[key];
}

export const styleText = (content: string, options?: StyleOptions) => new StyledText(content, options);
