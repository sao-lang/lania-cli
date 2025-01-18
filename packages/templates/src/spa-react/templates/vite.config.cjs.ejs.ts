import { TemplateOptions } from '../..';

const content = `
import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);
export default defineConfig({
    plugins: [
        // react(),
        visualizer({
            filename: 'dist/stats.html',
            open: false,
            gzipSize: true,
            template: 'sunburst'
        }),
        // viteCompression({
        //     verbose: true,
        //     disable: false,
        //     threshold: 10240,
        //     algorithm: 'gzip',
        //     ext: '.gz',
        //     deleteOriginFile: true
        // }),
    ],
    server: {
        host: '127.0.0.1',
        port: <%= port %>,
        open: true,
    },
    build: {
        minify: "terser", // 必须开启：使用terserOptions才有效果
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    // manualChunks(id) {
    //     if (id.includes('node_modules')) {
    //         return id.toString().split('node_modules/')[1].split('/')[0].toString();
    //     }
    // },
})`;
export default (options: TemplateOptions) => ({
    content,
    outputPath: '/vite.config.js',
    hide: options.buildTool !== 'vite' || options.language !== 'JavaScript',
});
