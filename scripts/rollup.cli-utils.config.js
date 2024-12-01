import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';
import fs from 'fs';
import path from 'path';

// Helper function to get all JavaScript files from the dist directory
function getAllFiles(
    dirPath = path.resolve(process.cwd(), '../packages/cli-utils/src'),
    ext = '.ts',
) {
    return fs
        .readdirSync(dirPath)
        .filter((file) => file.endsWith(ext))
        .map((file) => path.join(dirPath, file));
}

// Define the input files for Rollup
const inputFiles = getAllFiles(); // Get all JavaScript files from the dist directory

export default [
    // Configuration for source files
    {
        input: inputFiles,
        output: [
            {
                dir: 'dist/cjs',
                format: 'cjs',
                entryFileNames: '[name].cjs.js',
                exports: 'named', // 添加这一行
            },
            {
                dir: 'dist/esm',
                format: 'esm',
                entryFileNames: '[name].esm.js',
                exports: 'named', // 添加这一行
            },
        ],
        plugins: [resolve(), commonjs()],
    }
];
