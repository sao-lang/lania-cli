import { PackageManager } from './runner.base';

export default class NpmPackageManager extends PackageManager<'npm'> {
    constructor() {
        super(
            'npm',
            {
                install: 'install',
                add: 'install',
                update: 'update',
                remove: 'uninstall',
                init: 'init',
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
