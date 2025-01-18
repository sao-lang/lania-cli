import chalk from 'chalk';

export interface TextModifiers {
    color?: string;
    bgColor?: string;
    italic?: boolean;
    bold?: boolean;
    inverse?: boolean;
    dim?: number;
    visible?: boolean;
    underline?: boolean;
    overline?: boolean;
    strikethrough?: boolean;
    hidden?: boolean;
    prefix?: string;
    suffix?: string;
}

interface RGBColor {
    r: number;
    g: number;
    b: number;
}

// RGB 转 Hex
const rgbToHex = (r: number, g: number, b: number) =>
    `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;

// RGBA 转 Hex
const rgbaToHex = (r: number, g: number, b: number, a: number) =>
    `${rgbToHex(r, g, b)}${Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')}`;

// HSL 转 RGB
const hslToRgb = (h: number, s: number, l: number): RGBColor => {
    const C = (1 - Math.abs(2 * l - 1)) * s;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - C / 2;
    const getRgb = (t: number) => Math.round((t + m) * 255);

    let [r, g, b] = [0, 0, 0];
    if (h < 60) [r, g, b] = [C, X, 0];
    else if (h < 120) [r, g, b] = [X, C, 0];
    else if (h < 180) [r, g, b] = [0, C, X];
    else if (h < 240) [r, g, b] = [0, X, C];
    else if (h < 300) [r, g, b] = [X, 0, C];
    else [r, g, b] = [C, 0, X];

    return { r: getRgb(r), g: getRgb(g), b: getRgb(b) };
};

// 转换颜色字符串为 Hex
const colorStringToHex = (colorString: string): string => {
    const parseRgb = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    const parseHsl = colorString.match(
        /hsla?\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/,
    );

    if (parseRgb) {
        const [, r, g, b, a] = parseRgb.map(Number);
        return a !== undefined ? rgbaToHex(r, g, b, a) : rgbToHex(r, g, b);
    }
    if (parseHsl) {
        const [, h, s, l, a] = parseHsl.map(Number);
        const { r, g, b } = hslToRgb(h, s / 100, l / 100);
        return a !== undefined ? rgbaToHex(r, g, b, a) : rgbToHex(r, g, b);
    }

    return colorString;
};

// 主函数：应用文本样式
export const text = (str: string, options: TextModifiers = {}): string => {
    const { color, bgColor, prefix = '', suffix = '', ...rest } = options;
    str = `${prefix}${str}${suffix}`;

    if (color) str = chalk.hex(colorStringToHex(color))(str);
    if (bgColor) str = chalk.bgHex(colorStringToHex(bgColor))(str);

    for (const [key, value] of Object.entries(rest)) {
        if (!value) {
            continue;
        }
        const flag = key === 'dim' && typeof value === 'number';
        str = flag ? chalk.dim(str, value) : chalk[key](str);
    }

    return str;
};

export default text;
