const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 源代码根目录和输出目录
const ROOT_DIR = path.resolve(__dirname, 'src');
const OUTPUT_DIR = path.resolve(__dirname, 'dist');

// 匹配 `templates/**/templates/**/*.ts`
const FILE_PATTERN = 'templates/**/templates/**/*.ts';

/**
 * 将文件路径从 src 替换为 dist，保持目录结构
 * @param {string} filePath 源文件路径
 * @returns {string} 输出文件路径
 */
function getOutputPath(filePath) {
    return path.join(OUTPUT_DIR, path.relative(ROOT_DIR, filePath).replace(/\.ts$/, '.js'));
}

/**
 * 递归创建目录
 * @param {string} dirPath 目标目录路径
 */
function ensureDirectoryExistence(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * 编译单个 TypeScript 文件
 * @param {string} filePath 源文件路径
 */
function compileFile(filePath) {
    const outputFilePath = getOutputPath(filePath);
    ensureDirectoryExistence(path.dirname(outputFilePath));

    // 读取和编译 TypeScript 文件
    const source = fs.readFileSync(filePath, 'utf-8');
    const result = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS, // 或者指定其他模块系统
            target: ts.ScriptTarget.ESNext, // 指定输出 ES 版本
        },
    });

    // 写入编译后的文件
    fs.writeFileSync(outputFilePath, result.outputText, 'utf-8');
    console.log(`Compiled: ${filePath} -> ${outputFilePath}`);
}

/**
 * 主函数：查找匹配的文件并编译
 */
function compileTemplates() {
    const files = glob.sync(FILE_PATTERN, { cwd: ROOT_DIR, absolute: true });

    if (files.length === 0) {
        console.log('No files found for pattern:', FILE_PATTERN);
        return;
    }

    console.log(`Found ${files.length} file(s) to compile.`);
    files.forEach(compileFile);
}

// 执行脚本
compileTemplates();
