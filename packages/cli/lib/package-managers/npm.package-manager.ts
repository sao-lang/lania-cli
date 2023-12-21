import PackageManager from './package-manager.base';

export default class NpmPackageManager extends PackageManager {
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
