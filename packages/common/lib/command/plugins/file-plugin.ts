// FsPlugin.ts

import * as fs from 'fs/promises';
import { LaniaAction } from '../LaniaAction';
// 假设 LaniaPlugin 接口已导入或在本地定义

export class FsPlugin /* implements LaniaPlugin */ {
    public name = 'FsPlugin';

    /**
     * @description 插件核心方法，将逻辑注册到 Action 的 Hooks 上。
     * @param action LaniaAction 的实例，通过它访问 hooks。
     */
    public apply(action: LaniaAction<any>): void {
        this.tapFileWrite(action);
        this.tapOnError(action);
    }

    // --- Hook 注册方法 ---

    /**
     * 监听 onFileWrite Hook，执行实际的文件 I/O 操作。
     * 这是一个 Waterfall Hook：它接收内容，写入文件，并返回内容给下一个监听器（或最终调用者）。
     */
    private tapFileWrite(action: LaniaAction<any>): void {
        // 必须使用 as 断言确保 Hook 类型正确，以便 tapAsync 有正确的参数签名
        const fileWriteHook = action.hooks.onFileWrite;
        // @ts-ignore
        fileWriteHook.tapAsync(
            this.name,
            async (content, filePath, encoding) => {
                try {
                    console.log(`[FsPlugin] 正在写入文件: ${filePath}`);

                    // ⭐️ 核心逻辑：执行实际的磁盘写入操作
                    await fs.writeFile(filePath, content, { encoding });

                    // 必须返回 content，以确保 Hook 链能够将内容传递给下一个监听器
                    return content;
                } catch (error) {
                    // 如果文件写入失败，通知 onError Hook，然后抛出错误终止流程
                    (action.hooks.onError).call(error);
                    throw error;
                }
            }
        );
    }

    /**
     * 监听 onError Hook，用于清理或其他错误处理。
     * 这是一个 Parallel Hook。
     */
    private tapOnError(action: LaniaAction<any>): void {
        (action.hooks.onError as any).tap(this.name, (err: Error) => {
            console.error(`[FsPlugin] 检测到错误：${err.message}。尝试清理临时文件...`);
            // 实际清理逻辑...
        });
    }
}