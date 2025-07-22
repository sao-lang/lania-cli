import { PackageManagerName } from '@lania-cli/types';
import NpmPackageManager from './npm.package-manager';
import PnpmPackageManager from './pnpm.package-manager';
import YarnPackageManager from './yarn.package-manager';
import { detect } from 'detect-package-manager';
export class PackageManagerFactory {
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

export default PackageManagerFactory;
