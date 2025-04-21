const { series } = require('gulp');
const { spawn } = require('child_process');
const path = require('path');

const dirPath = path.resolve(__dirname, '../packages');

const run = async (command) => {
    return new Promise((resolve) => {
        const [cmd, ...args] = command.split(' ');
        const app = spawn(cmd, args, {
            cwd: path.resolve(__dirname, '.'),
            stdio: 'inherit',
            shell: true,
        });
        app.on('close', resolve); //
    });
};

const withTaskName = (name, fn) => {
    Object.assign(fn, { displayName: name });
    return fn;
};

const buildTemplate = () => {
    return withTaskName('build templates', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.template.config.js');
        await run(`rimraf ${dirPath}/templates/dist && rollup -c=${configFilePath}`);
    });
};

const buildCommon = () => {
    return withTaskName('build common', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.common.config.js');
        await run(`rimraf ${dirPath}/common/dist && rollup -c=${configFilePath}`);
    });
};

const buildCompilers = () => {
    return withTaskName('build compilers', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.compilers.config.js');
        await run(`rimraf ${dirPath}/compilers/dist && rollup -c=${configFilePath}`);
    });
};

const buildLinters = () => {
    return withTaskName('build linters', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.linters.config.js');
        await run(`rimraf ${dirPath}/linters/dist && rollup -c=${configFilePath}`);
    });
};

const buildCommandSync = () => {
    return withTaskName('build command-sync', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.command-sync.config.js');
        await run(`rimraf ${dirPath}/command-sync/dist && rollup -c=${configFilePath}`);
    });
};

const buildTypes = () => {
    return withTaskName('build types', async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.types.config.js');
        await run(`rimraf ${dirPath}/types/dist && rollup -c=${configFilePath}`);
    });
};

const buildCore = (watch) => {
    return withTaskName(`build core ${watch ? 'watch' : ''}`, async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.core.config.js');
        await run(
            `rimraf ${dirPath}/core/dist && rollup -c=${configFilePath} ${watch ? '-w' : ''}`,
        );
    });
};

module.exports = {
    buildTypes: series(buildTypes()),
    buildCommon: series(buildCommon()),
    buildTemplate: series(buildTemplate()),
    buildCompilers: series(buildCompilers()),
    buildLinters: series(buildLinters()),
    buildCommandSync: series(buildCommandSync()),
    buildCore: series(buildCore(false)),
    buildCoreWatch: series(buildCore(true)),
    build: series(buildTypes(), buildCommon(), buildTemplate(), buildCore(false)),
};
