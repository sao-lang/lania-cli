declare const __version: string;
declare const __cwd: string;

declare namespace NodeJS {
    interface Global {
        __cwd: string;
        __version: string
    }
}
