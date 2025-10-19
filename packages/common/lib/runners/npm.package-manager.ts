import { PackageManager } from './runner.base';

export class NpmPackageManager extends PackageManager<'npm'> {
    constructor() {
        super(
            'npm',
            {
                install: 'install',
                add: 'install',
                update: 'update',
                remove: 'uninstall',
                init: 'init',
                run: 'run'
            },
            {
                saveFlag: '--save',
                saveDevFlag: '--save-dev',
                silentFlag: '--silent',
                initFlag: '-y',
            },
        );
    }
}

export default NpmPackageManager;