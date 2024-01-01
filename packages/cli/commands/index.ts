import CommandLoader from './command.loader';
import { Command } from 'commander';
import pkgJsonContent from '../package.json';
import logger from '@utils/logger';
import ConfigurationLoader from '@lib/configuration/configuration.loader';
import to from '@utils/to';
import EsLinter from '@linters/eslint.linter';
import path from 'path';
import StyleLinter from '@linters/stylelint.linter';
import ejs from 'ejs';

const bootstrap = async () => {
    try {
        //     const content = ejs.render(
        //         `import <% if (buildTool === 'webpack' %>React, <% } %>{ useState } from 'react';
        // <% const map = {stylus: 'styl', sass: 'scss', less: 'less', tailwindcss: 'css'}; %>
        // import './App.<%= map?.[cssProcessor] ?? 'css' %>';

        // function App() {
        //     const [count, setCount] = useState(0);
        //     return (
        //         <>
        //             <h1><%=  buildTools[0] %> + React</h1>
        //             <button className="button" onClick={()=> setCount(count => count + 1)}>count is {count}</button>
        //         </>
        //     );
        // }
        // export default App;`,
        //         { buildTool: 'webpack', cssProcessor: 'css' },
        //     );
        const program = new Command();
        program
            .name(pkgJsonContent.name)
            .version(pkgJsonContent.version, '-v, --version', 'Output the current version.')
            .helpOption('-h, --help')
            .usage('<command> [option]');
        CommandLoader.load(program);
        program.parse();
    } catch (e) {
        logger.error(e.message, true);
    }
    // if (loadErr) {
    //     logger.error(loadErr.message, true);
    // }
    // const linter = new StyleLinter();
    // const [lintErr, result] = await to(
    //     linter.lint(path.resolve(process.cwd(), './index.css'), config, { fix: true }),
    // );
    // if (lintErr) {
    //     logger.error(lintErr.message as string, true);
    // }
    // console.log(result);
};
bootstrap();
