import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

export const mkDirs = async (dirPath: string) => {
    if (existsSync(dirPath)) {
        return true;
    } else {
        const result = await mkDirs(dirname(dirPath));
        if (result) {
            await mkdir(dirPath);
            return true;
        }
    }
};
