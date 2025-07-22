import { PackageManager } from './runner.base';

export default class PnpmPackageManager extends PackageManager<'pnpm'> {
    constructor() {
        super(
            'pnpm',
            {
                install: 'install --strict-peer-dependencies=false',
                add: 'install --strict-peer-dependencies=false',
                update: 'update',
                remove: 'uninstall',
                init: 'init',
            },
            {
                saveFlag: '--save',
                saveDevFlag: '--save-dev',
                silentFlag: '--reporter=silent',
                initFlag: '',
            },
        );
    }
}
