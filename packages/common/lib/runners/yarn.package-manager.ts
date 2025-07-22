import { PackageManager } from './runner.base';

export default class YarnPackageManager extends PackageManager<'yarn'> {
    constructor() {
        super(
            'yarn',
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
