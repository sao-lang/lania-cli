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

const LEVEL_STYLES: Record<LogLevel, Parameters<typeof styleText>[1] & { loggerPrefix?: string }> =
    {
        log: {},
        info: { color: '#3498db', loggerPrefix: 'Info: ' },
        warn: { color: '#f39c12', bold: true, loggerPrefix: 'Warn: ' },
        error: { color: '#e74c3c', bold: true, loggerPrefix: 'Error: ' },
        success: { color: '#2ecc71', loggerPrefix: 'Success: ' },
        ascii: { color: '#9b59b6', bold: true },
    };

function getTimestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function formatMessage(level: LogLevel, message: string, options?: LoggerOptions): string {
    const { loggerPrefix = '', ...rest } = LEVEL_STYLES[level];
    const merged = {
        ...rest,
        ...options?.style,
        prefix: options?.prefix ?? '',
        suffix: options?.suffix ?? '',
    };

    const time = options?.useTimestamp ? `[${getTimestamp()}] ` : '';
    return time + styleText(`${loggerPrefix}${message}`, merged).render();
}

export const logger = {
    log(msg: string, opts?: LoggerOptions) {
        console.log(formatMessage('log', msg, opts));
    },
    info(msg: string, opts?: LoggerOptions) {
        console.info(`${formatMessage('info', msg, opts)}`);
    },
    warn(msg: string, opts?: LoggerOptions) {
        console.warn(`${formatMessage('warn', msg, opts)}`);
    },
    error(msg: string, opts?: LoggerOptions) {
        console.error(`${formatMessage('error', msg, opts)}`);
    },
    success(msg: string, opts?: LoggerOptions) {
        console.log(`${formatMessage('success', msg, opts)}`);
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
