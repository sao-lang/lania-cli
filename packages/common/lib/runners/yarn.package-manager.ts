import { PackageManager } from './runner.base';

export class YarnPackageManager extends PackageManager<'yarn'> {
    constructor() {
        super(
            'yarn',
            {
                install: 'install',
                add: 'add',
                update: 'upgrade',
                remove: 'remove',
                init: 'init',
                run: 'run'
            },
            { saveFlag: '', saveDevFlag: '-D', silentFlag: '--silent', initFlag: '-y' },
        );
    }
}


export default YarnPackageManager;