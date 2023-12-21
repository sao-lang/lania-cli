import chalk from 'chalk';
import ora from 'ora';
import logger from './logger';
export const loading = async (
    message: string,
    callback: () => Promise<{
        status: 'fail' | 'succeed' | 'stop';
        message?: string;
        error: null | Error;
    }>,
) => {
    const spin = ora(chalk.bold(`${message}`));
    spin.spinner = {
        interval: 70,
        frames: ['-', '/', '|', '\\'],
    };
    spin.start();
    const { status, message: returnMessage, error } = await callback();
    if (status === 'stop') {
        spin.stop();
        return true;
    }
    if (status === 'fail') {
        spin.fail(chalk.bold(`${returnMessage}\n`));
        if (error) {
            logger.error(error.message, true);
        }
    }
    spin.succeed(chalk.bold(`${returnMessage}\n`));
    return true;
};

export default loading;
