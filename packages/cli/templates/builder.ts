import { CommandCreateOptions } from '@commands/create.command';
import { CSS_PROCESSORS, LINT_TOOLS, PACKAGE_TOOLS, UNIT_TEST_TOOLS } from '@constants/index';
import inquirer, { Answers } from 'inquirer';
import { createCheckboxQuestion, createListQuestion } from './questions';
import to from '@utils/to';
import logger from '@utils/logger';
import { TemplateFactory, type TemplateOptions } from '@laniakea/templates';

export class Builder {
    private options: Record<string, any> = {};
    public async prompt(options: CommandCreateOptions) {
        const templateList = await TemplateFactory.list();
        const choices: Answers = [
            createListQuestion({
                type: 'list',
                message: 'Please select project template:',
                name: 'template',
                choices: templateList,
            }),
            // createListQuestion({
            //     name: 'frame',
            //     message: 'Please select a frame:',
            //     choices: ({ type }: { type: string }) => {
            //         return [...PROJECT_TYPE_FRAMES_MAP[type], 'no'];
            //     },
            //     when: ({ type }: { type: string }) => {
            //         if (['toolkit'].includes(type)) {
            //             return false;
            //         }
            //         return true;
            //     },
            // }),
            createListQuestion({
                message: 'Please select a css processor:',
                name: 'cssProcessor',
                choices: CSS_PROCESSORS,
                default: 'sass',
                when: ({ template }: { template: string }) => {
                    if (['nodejs', 'toolkit'].some((item) => template.includes(item))) {
                        return false;
                    }
                    return true;
                },
            }),
            createCheckboxQuestion({
                message: 'Please select the lint tools:',
                name: 'lintTools',
                choices: LINT_TOOLS,
            }),
            createListQuestion({
                message: 'Please select a unit testing tool',
                name: 'unitTestTool',
                choices: [...UNIT_TEST_TOOLS, 'no'],
            }),
            createListQuestion({
                name: 'buildTool',
                message: 'Please select a build tool:',
                choices: ({ template }: { template: string }) => {
                    const flag = ['spa', 'ssr', 'nodejs', 'vanilla'].some((item) =>
                        template.includes(item),
                    );
                    if (flag) {
                        return ['webpack', 'vite'];
                    }
                    return ['rollup', 'gulp', 'tsc'];
                },
            }),
            createListQuestion({
                name: 'packageTool',
                message: 'Please select a packaging tool:',
                choices: PACKAGE_TOOLS,
                when: () => {
                    if (options.packageManager) {
                        return false;
                    }
                    return true;
                },
            }),
        ];
        const [promptErr, answers] = await to(inquirer.prompt(choices));
        if (promptErr) {
            throw promptErr;
        }
        if (answers.frame === 'no') {
            answers.frame = undefined;
        }
        if (answers.unitTestTool === 'no') {
            answers.unitTestTool = undefined;
        }
        return answers;
    }
    public async build(options: CommandCreateOptions) {
        const [promptErr, answers] = await to(this.prompt(options));
        if (promptErr) {
            logger.error(promptErr.message, true);
        }
        const template = TemplateFactory.create(answers.template);
        const dependencies = template.getDependenciesArray(answers as TemplateOptions);
        this.options = answers;
        console.log({ dependencies });
    }
}
