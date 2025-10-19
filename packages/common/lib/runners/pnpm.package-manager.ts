import { PackageManager } from './runner.base';

export class PnpmPackageManager extends PackageManager<'pnpm'> {
    constructor() {
        super(
            'pnpm',
            {
                install: 'install --strict-peer-dependencies=false',
                add: 'install --strict-peer-dependencies=false',
                update: 'update',
                remove: 'uninstall',
                init: 'init',
                run: 'run'
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

export default PnpmPackageManager;