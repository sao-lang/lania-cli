import fs from 'fs';
import path from 'path';
export const mkDirsSync = (dirname: string) => {
    try {
        if (fs.existsSync(dirname)) {
            return true;
        } else {
            if (mkDirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname);
                return true;
            }
        }
    } catch (e) {
        throw e as Error;
    }
};

/**输出文件*/
export const writeFile = (data: string | Buffer, filePath: string) => {
    return new Promise((resolve: (value: boolean) => void, reject) => {
        const findIndex = filePath.lastIndexOf('/');
        const dirname = filePath.slice(0, findIndex);
        try {
            mkDirsSync(dirname);
        } catch (e) {
            reject(e);
        }
        fs.writeFile(filePath, data, (err) => {
            if (err) {
                reject(err);
            }
            return resolve(true);
        });
    });
};

export const readFile = (filePath: string) => {
    return new Promise((resolve: (value: string) => void, reject) => {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                reject(err);
            }
            return resolve(data);
        });
    });
};

export const fileIsExist = (filePath: string) => {
    try {
        fs.accessSync(filePath);
        return true;
    } catch (e) {
        return false;
    }
};

export const dirIsEmpty = (dirName: string) => {
    const data = fs.readdirSync(dirName);
    return !(data.length > 0);
};
