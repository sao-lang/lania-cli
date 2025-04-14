// logger.ts
import figlet from 'figlet';
import { styleText } from './style-text';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'success' | 'ascii';

type LoggerOptions = {
    prefix?: string;
    suffix?: string;
    style?: Parameters<typeof styleText>[1]; // same as StyleOptions
    useTimestamp?: boolean;
};

const LEVEL_STYLES: Record<LogLevel, Parameters<typeof styleText>[1]> = {
    log: {},
    info: { color: '#3498db' },
    warn: { color: '#f39c12', bold: true },
    error: { color: '#e74c3c', bold: true },
    success: { color: '#2ecc71' },
    ascii: { color: '#9b59b6', bold: true },
};

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
    const merged = {
        ...LEVEL_STYLES[level],
        ...options?.style,
        prefix: options?.prefix ?? '',
        suffix: options?.suffix ?? '',
    };

    const time = options?.useTimestamp ? `[${getTimestamp()}] ` : '';
    return time + styleText(message, merged).render();
}

export const logger = {
    log(msg: string, opts?: LoggerOptions) {
        console.log(formatMessage('log', msg, opts));
    },
    info(msg: string, opts?: LoggerOptions) {
        console.info(formatMessage('info', msg, opts));
    },
    warn(msg: string, opts?: LoggerOptions) {
        console.warn(formatMessage('warn', msg, opts));
    },
    error(msg: string, opts?: LoggerOptions) {
        console.error(formatMessage('error', msg, opts));
    },
    success(msg: string, opts?: LoggerOptions) {
        console.log(formatMessage('success', msg, opts));
    },
    ascii(msg: string, opts?: LoggerOptions) {
        const banner = figlet.textSync(msg);
        const styled = styleText(banner, {
            ...LEVEL_STYLES.ascii,
            ...opts?.style,
        }).render();
        console.log(styled);
    },
};
