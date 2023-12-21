import figlet from 'figlet';
import { TextModifiers, text } from './text';

export const logger = {
    success: (message: string) => {
        console.log(`\n${text(`Success: ${message}`, { color: '#a8cc8c', bold: true })}\n`);
    },
    error: (message: string, interrupt: boolean = false) => {
        console.error(`\n${text(`Error: ${message}`, { color: '#ff0000', bold: true })}\n`);
        if (interrupt) {
            process.exit(1);
        }
    },
    warning: (message: string) => {
        console.warn(`\n${text(`Warning: ${message}`, { bold: true, color: '#dbab79' })}\n`);
    },
    info: (message: string) => {
        console.info(`\n${text(`Info: ${message}`, { color: '#87ceeb', bold: true })}\n`);
    },
    bold: (message: string, color?: string) => {
        console.log(`\n${text(message, { bold: true, color })}\n`);
    },
    italic: (message: string, color?: string) => {
        console.log(`\n${text(message, { color, italic: true })}`);
    },
    fig: (message: string, modifiers: TextModifiers = {}) => {
        return new Promise((resolve: (value: boolean) => void, reject) => {
            figlet.text(
                message,
                {
                    horizontalLayout: 'fitted',
                },
                (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    console.log(`\n${text(data, modifiers)}`);
                    return resolve(true);
                },
            );
        });
    },
    loading: (message: string) => {
        console.log(`\n${text(`⏳: ${message}`)}\n`);
    },
    log: (message: string, modifiers?: TextModifiers) => {
        console.log(text(message, modifiers));
    },
};

export default logger;
