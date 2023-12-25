import to from '@utils/to';
import NpmPackageManager from './npm.package-manager';
import { type PackageManagerName } from './package-manager.base';
import PnpmPackageManager from './pnpm.package-manager';
import YarnPackageManager from './yarn.package-manager';
import { detect } from 'detect-package-manager';
export default class PackageManagerFactory {
    public static async create(name: PackageManagerName) {
        switch (name) {
            case 'npm':
                return new NpmPackageManager();
            case 'pnpm':
                return new PnpmPackageManager();
            case 'yarn':
                return new YarnPackageManager();
            default:
                throw new Error(`Package manager ${name} is not managed.`);
        }
    }
    public static async find(cwd = process.cwd()) {
        return await detect({ cwd });
    }
}
