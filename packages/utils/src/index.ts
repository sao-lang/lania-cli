// export * from './progress-tracker';
export {};
import { TaskRunner } from './task-runner';
import { ProgressTracker } from './progress-tracker';

// 初始化模块
const runner = new TaskRunner(3); // 最大并行数3
const tracker = new ProgressTracker();

// 注册事件监听
runner.on('progress', (event) => {
    tracker.update(event);
});
// .on('error', (err) => console.error('Runner error:', err));

// 配置任务链
runner.series({
    name: '初始化项目',
    execute: async () => {
        await new Promise((r) => setTimeout(r, 100));
    },
    retries: 2,
    // onStart: (ctx) => console.log('初始化项目开始'),
    // onSuccess: (ctx) => console.log('初始化项目成功'),
    // onError: (err, ctx) => console.error('初始化项目失败:', err.message),
    // onTimeout: (ctx) => console.warn('初始化项目超时'),
    // onRetry: (attempt, ctx) => console.log(`初始化项目重试第 ${attempt} 次`),
});
// .parallel(
//     {
//         name: '并行任务1',
//         execute: async () => {
//             await new Promise((r) => setTimeout(r, 2000));
//         },
//     },
//     {
//         name: '并行任务2',
//         execute: async () => {
//             await new Promise((r) => setTimeout(r, 1500));
//         },
//     },
// );
// .series({
//     name: '最终部署',
//     timeout: 3000,
//     execute: async ({ cancel }) => {
//         await new Promise((r) => setTimeout(r, 3000));
//     },
//     onTimeout: (ctx) => console.warn('最终部署超时'),
//     onError: (err, ctx) => console.error('最终部署失败:', err.message),
// });

// 执行任务
runner.run();
