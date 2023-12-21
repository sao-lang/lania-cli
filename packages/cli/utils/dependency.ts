import { serialExec } from './exec';
import semver from 'semver';
import to from './to';

export const getDependencyVersion = async (
    packageName: string,
    registry = 'https://registry.npmmirror.com',
    // registry = 'https://registry.npm.taobao.org'
) => {
    const [err, latestVersion] = await to(
        serialExec(`npm view ${packageName} version --registry=${registry}`),
    );
    if (err) {
        return err;
    }
    return latestVersion!.data!.replace('\n', '');
};

export const getDependency = async (dependencies: Record<string, string> | string[]) => {
    const latestMap: Record<string, string> = {};
    if (Array.isArray(dependencies)) {
        for (const dependency of dependencies) {
            const [err, version] = await to(getDependencyVersion(dependency));
            if (err) {
                throw err;
            }
            latestMap[dependency] = `^${version}`;
        }
        return latestMap;
    }
    for (const key in dependencies) {
        const [err, version] = await to(getDependencyVersion(key));
        if (err) {
            throw err;
        }
        latestMap[key] = `^${version}`;
    }
    return latestMap;
};

export const dependencyVersionIsLatest = async (packageName: string, version: string) => {
    const latestVersion = await getDependencyVersion(packageName);
    if (version && semver.lt(version, latestVersion as string)) {
        return false;
    }
    return true;
};
