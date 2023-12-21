import { exec } from 'shelljs';
import to from './to';

interface ExecCommandItemObject {
    command: string;
    silent?: boolean;
    onData?: (data: string) => void;
    onEnd?: (res: ExecCommandReturnObject) => void;
    onError?: (err: Error) => void;
    onStart?: () => void;
}

type ExecCommandSchema =
    | ExecCommandItemObject
    | ExecCommandItemObject[]
    | string
    | string[]
    | (ExecCommandItemObject | string)[];

interface ExecCommandReturnObject {
    data: string | undefined;
    error: Error | null;
}

// type ExecCommandReturnSchema = ExecCommandReturnObject | ExecCommandReturnObject[];

type WhenManyCommandsType = () => Promise<ExecCommandReturnObject[]>;

const execPromise = (commandItem: ExecCommandItemObject) => {
    return new Promise((resolve: (value: string) => void, reject) => {
        const { command, onData, onEnd, onError, silent = true, onStart } = commandItem;
        onStart?.();
        const output = exec(command, {
            silent,
            async: true,
        });
        const { stdout, stderr } = output;
        let res = '';
        let error = '';
        stdout?.on('data', (data: string) => {
            res += data;
            onData?.(data);
        });
        stderr?.on('data', (err: string) => {
            error = err;
        });
        output?.on('close', (code) => {
            if (code !== 0) {
                const returnErr = new Error(error);
                onError?.(returnErr);
                onEnd?.({ error: returnErr, data: undefined });
                return reject(returnErr);
            }
            onEnd?.({ data: res, error: null });
            output.kill();
            return resolve(res);
        });
    });
};

const wrapperCommand = (item: string | ExecCommandItemObject) => {
    return typeof item === 'string' ? { command: item } : item;
};

async function baseExecCommands(
    command: ExecCommandSchema,
    whenManyCommands: WhenManyCommandsType,
) {
    if (typeof command === 'string') {
        const [err, res] = await to(execPromise({ command }));
        if (err) {
            throw err;
        }
        return { data: res, error: null };
    }
    if (Array.isArray(command)) {
        const [err, res] = await to(whenManyCommands());
        if (err) {
            throw err;
        }
        return res;
    }
    const [err, res] = await to(execPromise(command as ExecCommandItemObject));
    if (err) {
        throw err;
    }
    return { data: res, error: null };
}

export function serialExec(
    command: string,
    kill?: boolean,
    tag?: string,
): Promise<ExecCommandReturnObject>;
// eslint-disable-next-line no-redeclare
export function serialExec(
    command: string[],
    kill?: boolean,
    tag?: string,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function serialExec(
    command: ExecCommandItemObject,
    kill?: boolean,
    tag?: string,
): Promise<ExecCommandReturnObject>;
// eslint-disable-next-line no-redeclare
export function serialExec(
    command: ExecCommandItemObject[],
    kill?: boolean,
    tag?: string,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function serialExec(
    command: (ExecCommandItemObject | string)[],
    kill?: boolean,
    tag?: string,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function serialExec(command: ExecCommandSchema, kill = true) {
    return baseExecCommands(command, async () => {
        const result: { data: string | undefined; error: Error | null }[] = [];
        for (const item of command as ExecCommandItemObject[]) {
            const [err, res] = await to(execPromise(wrapperCommand(item)));
            result.push({ data: err ? undefined : res, error: err });
            if (err && kill) {
                throw err;
            }
        }
        return result;
    });
}

const parallelCycle = async (
    command: (ExecCommandItemObject | string)[],
    handle: typeof Promise.all | typeof Promise.allSettled,
    parallelNum: number,
) => {
    const result: (string | { value: any; reason: any })[] = [];
    const count = 1;
    const len = (command as (ExecCommandItemObject | string)[]).length;
    const isPromiseAll = handle === Promise.all;
    while (parallelNum * count < len) {
        const splitted = (command as (ExecCommandItemObject | string)[]).slice(
            (count - 1) * parallelNum,
            parallelNum * count,
        );
        const [err, promises] = await to(
            (handle as any)(splitted.map((item) => execPromise(wrapperCommand(item)))),
        );
        if (isPromiseAll && err) {
            throw err;
        }
        result.push(...(promises as string[]));
    }
    if (isPromiseAll) {
        return result!.map((promise) => ({
            data: promise,
            error: null,
        })) as ExecCommandReturnObject[];
    }
    return result!.map(({ reason, value }: any) => ({
        data: !reason ? value : undefined,
        error: reason ? new Error(reason) : null,
    })) as ExecCommandReturnObject[];
};

export function parallelExec(
    command: string,
    kill?: boolean,
    parallelNum?: number,
): Promise<ExecCommandReturnObject>;
// eslint-disable-next-line no-redeclare
export function parallelExec(
    command: string[],
    kill?: boolean,
    parallelNum?: number,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function parallelExec(
    command: ExecCommandItemObject,
    kill?: boolean,
    parallelNum?: number,
): Promise<ExecCommandReturnObject>;
// eslint-disable-next-line no-redeclare
export function parallelExec(
    command: ExecCommandItemObject[],
    kill?: boolean,
    parallelNum?: number,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function parallelExec(
    command: (ExecCommandItemObject | string)[],
    kill?: boolean,
    parallelNum?: number,
): Promise<ExecCommandReturnObject[]>;
// eslint-disable-next-line no-redeclare
export function parallelExec(command: ExecCommandSchema, kill = true, parallelNum: number = 5) {
    return baseExecCommands(command, async () => {
        const [err, res] = await to(
            parallelCycle(
                command as (ExecCommandItemObject | string)[],
                kill ? Promise.all : Promise.allSettled,
                parallelNum,
            ),
        );
        if (err) {
            throw err;
        }
        return res;
    });
}
