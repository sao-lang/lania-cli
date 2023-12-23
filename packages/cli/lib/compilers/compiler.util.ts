import to from '@utils/to';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export const mkDirs = async (dirPath: string) => {
    try {
        if (existsSync(dirPath)) {
            return true;
        } else {
            const [mkDirsErr, mkDirsResult] = await to(mkDirs(dirname(dirPath)));
            if (mkDirsErr) {
                throw mkDirsErr;
            }
            if (mkDirsResult) {
                const [mkdirErr] = await to(mkdir(dirPath));
                if (mkdirErr) {
                    throw mkdirErr;
                }
                return true;
            }
        }
    } catch (e) {
        throw e as Error;
    }
};
