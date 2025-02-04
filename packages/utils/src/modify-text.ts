import chalk, { Chalk } from 'chalk';
import Color from 'color';

export interface TextModifiers {
    color?: string;
    bgColor?: string;
    italic?: boolean;
    bold?: boolean;
    inverse?: boolean;
    dim?: boolean;
    visible?: boolean;
    underline?: boolean;
    overline?: boolean;
    strikethrough?: boolean;
    hidden?: boolean;
}

class StyledText {
    private text: string;
    private style: Chalk;

    constructor(text: string, style: Chalk = chalk) {
        this.text = text;
        this.style = style;
    }

    // 核心样式方法
    color(colorStr: string): StyledText {
        return this.applyColor(colorStr, 'foreground');
    }

    bgColor(colorStr: string): StyledText {
        return this.applyColor(colorStr, 'background');
    }

    bold(): StyledText {
        return new StyledText(this.text, this.style.bold);
    }

    italic(): StyledText {
        return new StyledText(this.text, this.style.italic);
    }

    underline(): StyledText {
        return new StyledText(this.text, this.style.underline);
    }

    strikethrough(): StyledText {
        return new StyledText(this.text, this.style.strikethrough);
    }

    inverse(): StyledText {
        return new StyledText(this.text, this.style.inverse);
    }

    dim(): StyledText {
        return new StyledText(this.text, this.style.dim);
    }

    visible(): StyledText {
        return new StyledText(this.text, this.style.visible);
    }

    hidden(): StyledText {
        return new StyledText(this.text, this.style.hidden);
    }

    overline(): StyledText {
        // @ts-ignore
        return new StyledText(this.text, this.style.overline);
    }

    // 最终输出方法
    toString(): string {
        return this.style(this.text);
    }

    // 实用方法：拼接文本
    append(text: string): StyledText {
        return new StyledText(this.text + text, this.style);
    }

    // 实用方法：嵌套样式
    nest(callback: (text: StyledText) => StyledText): StyledText {
        return callback(this);
    }

    // 私有方法：应用颜色
    private applyColor(colorStr: string, type: 'foreground' | 'background'): StyledText {
        try {
            const hexColor = Color(colorStr).hex();
            const newStyle = hexColor.startsWith('#')
                ? type === 'foreground'
                    ? this.style.hex(hexColor)
                    : this.style.bgHex(hexColor)
                : type === 'foreground'
                ? this.style.keyword(hexColor)
                : this.style.bgKeyword(hexColor);

            return new StyledText(this.text, newStyle);
        } catch {
            return this; // 无效颜色保持原样
        }
    }
}

// 创建链式调用的入口函数
export const text = (str: string, options?: TextModifiers): StyledText => {
    let style: any = chalk;

    // 处理初始化选项
    if (options) {
        if (options.color) {
            style = style.hex(Color(options.color).hex());
        }
        if (options.bgColor) {
            style = style.bgHex(Color(options.bgColor).hex());
        }
        if (options.bold) style = style.bold();
        if (options.italic) style = style.italic();
        if (options.underline) style = style.underline();
        if (options.strikethrough) style = style.strikethrough();
        if (options.inverse) style = style.inverse();
        if (options.dim) style = style.dim();
        if (options.visible) style = style.visible();
        if (options.hidden) style = style.hidden();
        if (options.overline) style = style.overline();
    }

    return new StyledText(str, style);
};

export default text;
