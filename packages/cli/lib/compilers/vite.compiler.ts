import vite, { type InlineConfig, build } from 'vite';
import Compiler, { type ConfigOption, type BaseCompilerInterface } from './compiler.base';
export default class ViteCompiler extends Compiler {
    constructor(configOption?: ConfigOption, config: Record<string, any> = {}) {
        const baseCompiler: BaseCompilerInterface = {
            build: async (config: InlineConfig) => {
                const output = await build(config);
                return output;
            },
            createServer: (config: Record<string, any>) => {},
            closeServer: () => {},
        };
        super(baseCompiler, configOption || { module: 'vite' }, config);
    }
    // public async build() {
    //     const originalConsoleLog = console.log;
    //     const originalConsoleError = console.error;

    //     // 重写 console.log
    //     console.log = function (...args) {
    //         // 在这里实现自定义输出逻辑，例如将日志写入文件等
    //         // args 是传递给 console.log 的参数数组
    //         // originalConsoleLog.apply(console);
    //     };

    //     // 重写 console.error
    //     console.error = function (...args) {
    //         // 在这里实现自定义输出逻辑，例如将错误信息发送到远程服务
    //         // args 是传递给 console.error 的参数数组
    //         // originalConsoleError.apply(console, args);
    //     };

    //     const config = await getModuleConfig('vite');
    //     const output = await build({ ...config, build: { ...(config.build || {}) } });
    //     // output
    //     originalConsoleLog(output);
    //     // (output as Rollup.RollupWatcher).on('change', (data) => {
    //     //     console.log({ data });
    //     // });
    // }
}
