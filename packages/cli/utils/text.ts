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

// RGB 颜色转换为 Hex 颜色
function rgbToHex(r: number, g: number, b: number): string {
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// RGBA 颜色转换为 Hex 颜色
function rgbaToHex(r: number, g: number, b: number, a: number): string {
    const alphaHex = Math.round(a * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}${alphaHex}`;
}

// 辅助函数：HSL 转换为 RGB
function hslToRgb(h: number, s: number, l: number): RGBColor {
    const C = (1 - Math.abs(2 * l - 1)) * s;
    const X = C * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - C / 2;

    let r, g, b;
    if (0 <= h && h < 60) {
        [r, g, b] = [C, X, 0];
    } else if (60 <= h && h < 120) {
        [r, g, b] = [X, C, 0];
    } else if (120 <= h && h < 180) {
        [r, g, b] = [0, C, X];
    } else if (180 <= h && h < 240) {
        [r, g, b] = [0, X, C];
    } else if (240 <= h && h < 300) {
        [r, g, b] = [X, 0, C];
    } else {
        [r, g, b] = [C, 0, X];
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
    };
}
// 将不同颜色表示方式的字符串转换为 Hex 颜色值
function colorStringToHex(colorString: string): string {
    const rgbMatch = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch;
        return rgbToHex(parseInt(r), parseInt(g), parseInt(b));
    }

    const rgbaMatch = colorString.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (rgbaMatch) {
        const [, r, g, b, a] = rgbaMatch;
        return rgbaToHex(parseInt(r), parseInt(g), parseInt(b), parseFloat(a));
    }

    const hslMatch = colorString.match(/hsl\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
    if (hslMatch) {
        const [, h, s, l] = hslMatch;
        const rgb = hslToRgb(parseFloat(h), parseFloat(s), parseFloat(l));
        return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    const hslaMatch = colorString.match(/hsla\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/);
    if (hslaMatch) {
        const [, h, s, l, a] = hslaMatch;
        const rgb = hslToRgb(parseFloat(h), parseFloat(s), parseFloat(l));
        return rgbaToHex(rgb.r, rgb.g, rgb.b, parseFloat(a));
    }

    // 如果没有匹配，则返回空字符串或默认值
    return colorString;
}

export const text = (str: string, options?: TextModifiers) => {
    if (!options) {
        return str;
    }
    const { color, bgColor, suffix, prefix, ...rest } = options || {};
    if (prefix) {
        str = prefix + str;
    }
    if (suffix) {
        str += suffix;
    }
    if (color) {
        str = chalk.hex(colorStringToHex(color))(str);
    }
    if (bgColor) {
        str = chalk.bgHex(colorStringToHex(bgColor))(str);
    }
    Object.keys(rest).forEach(key => {
        if (key === 'dim' && typeof rest.dim === 'number') {
            str = chalk.dim(str, rest.dim);
        }
        if (rest[key as Exclude<keyof TextModifiers, 'dim' | 'color' | 'bgColor' | 'prefix' | 'suffix'>] as boolean) {
            // @ts-ignore
            str = chalk?.[key as any]?.(str) || str;
        }
    });
    return str;
};

export default text;