import chalk, { type Chalk } from 'chalk';

type StyleOptions = {
    color?: string;
    bgColor?: string;
    prefix?: string;
    suffix?: string;
    dimLevel?: number;
} & Partial<Record<keyof typeof STYLE_FLAGS, boolean>>;

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
    private chain: Chalk;
    private _options: StyleOptions;

    constructor(
        private content: string,
        options: StyleOptions = {},
    ) {
        this._options = { ...options };
        this.chain = this.initStyleEngine();
    }

    private initStyleEngine(): Chalk {
        let engine = chalk as Chalk;

        // 优先处理灰度模拟
        if (
            typeof this._options.dimLevel === 'number' &&
            this._options.dimLevel >= 1 &&
            this._options.dimLevel <= 10
        ) {
            const level = this._options.dimLevel;
            const gray = 255 - Math.floor((level / 10) * 255);
            const hex = ColorParser.rgbToHex(gray, gray, gray);
            engine = engine.hex(hex) as Chalk;
        } else {
            if (this._options.color) {
                engine = engine.hex(ColorParser.parse(this._options.color));
            }
        }

        if (this._options.bgColor) {
            engine = engine.bgHex(ColorParser.parse(this._options.bgColor));
        }

        for (const key in STYLE_FLAGS) {
            if (this._options[key as keyof StyleOptions]) {
                const method = STYLE_FLAGS[key as keyof typeof STYLE_FLAGS];
                engine = engine[method]() as Chalk;
            }
        }

        return engine;
    }

    static createChainMethods(): Record<keyof typeof STYLE_FLAGS, () => StyledText> {
        const methods = {} as Record<keyof typeof STYLE_FLAGS, () => StyledText>;
        for (const key in STYLE_FLAGS) {
            methods[key as keyof typeof STYLE_FLAGS] = function (this: StyledText) {
                this._options[key] = true;
                this.chain = this.initStyleEngine();
                return this;
            };
        }
        return methods;
    }

    config(options: Partial<StyleOptions>): StyledText {
        this._options = { ...this._options, ...options };
        this.chain = this.initStyleEngine();
        return this;
    }

    render(): string {
        const { prefix = '', suffix = '' } = this._options;
        return this.chain(`${prefix}${this.content}${suffix}`);
    }
}

Object.assign(StyledText.prototype, StyledText.createChainMethods());

export const styleText = (content: string, options?: StyleOptions) => new StyledText(content, options);
