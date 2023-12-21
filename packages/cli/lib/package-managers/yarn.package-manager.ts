import PackageManager from './package-manager.base';

export default class YarnPackageManager extends PackageManager {
    constructor() {
        super(
            'npm',
            {
                install: 'install',
                add: 'add',
                update: 'upgrade',
                remove: 'remove',
                init: 'init',
            },
            { saveFlag: '', saveDevFlag: '-D', silentFlag: '--silent', initFlag: '-y' },
        );
    }
}
