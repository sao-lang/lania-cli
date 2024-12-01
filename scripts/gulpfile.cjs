const { series } = require('gulp');
const { spawn } = require('child_process');
// const fs = require('fs');
const path = require('path');

const dirPath = path.resolve(__dirname, '../packages');
// const targets = fs.readdirSync(dirPath).filter((f) => {
//     if (!fs.statSync(`${dirPath}/${f}`).isDirectory() || f === 'cli') {
//         return false;
//     }
//     return true;
// });

const run = async (command) => {
    return new Promise((resolve) => {
        // 将命令分割 例如：rm -rf 分割为['rm', '-rf'],进行解构[cmd,...args]
        const [cmd, ...args] = command.split(' ');
        const app = spawn(cmd, args, {
            cwd: path.resolve(__dirname, '.'),
            stdio: 'inherit',
            shell: true, // 默认情况下 linux才支持 rm -rf  windows安装git bash
        });
        // 在进程已结束并且子进程的标准输入输出流已关闭之后，则触发 'close' 事件
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

const buildCli = (watch) => {
    return withTaskName(`build cli ${watch ? 'watch' : ''}`, async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.cli.config.js');
        await run(`rimraf ${dirPath}/cli/dist && rollup -c=${configFilePath} ${watch ? '-w' : ''}`);
    });
};

const buildCliUtils = (watch) => {
    return withTaskName(`build cli-utils ${watch ? 'watch' : ''}`, async () => {
        const configFilePath = path.resolve(__dirname, '../scripts/rollup.cli-utils.config.js');
        await run(
            `rimraf ${dirPath}/cli-utils/dist && rollup -c=${configFilePath} ${watch ? '-w' : ''}`,
        );
    });
};

module.exports = {
    buildTemplate: series(buildTemplate()),
    buildCli: series(buildCli(false)),
    buildCliWatch: series(buildCli(true)),
    build: series(buildCli(false), buildTemplate()),
    buildCliUtils: series(buildCliUtils()),
    buildCliUtilsWatch: series(buildCliUtils(true)),
};
