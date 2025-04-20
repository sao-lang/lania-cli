import { extname } from 'path';

export const getFileExt = <T extends string>(filePath: string) => {
    return extname(filePath).replace('.', '') as T;
};
