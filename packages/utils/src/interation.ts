import inquirer, { Question, ChoiceOptions, Answers } from 'inquirer';
import chalk from 'chalk';

// 定义问题类型
type StaticQuestion<T extends Answers> = Question<T> & {
    name: keyof T; // 确保 name 是 T 的键
    type: 'input' | 'number' | 'confirm' | 'list' | 'checkbox' | 'expand' | 'password' | 'editor'; // 显式指定 type 类型
    choices?: ChoiceOptions[] | string[]
};

type DynamicQuestion<T extends Answers> = (answers: T) => StaticQuestion<T>;
type QuestionConfig<T extends Answers> = StaticQuestion<T> | DynamicQuestion<T>;

interface CLIConfig<T extends Answers> {
    maxBackSteps?: number;
    allowBack?: boolean;
    hooks?: {
        beforeRun?: () => Promise<void>;
        afterRun?: (answers: T) => Promise<void>;
    };
}

export class CLInteraction<T extends Record<string, any>> {
    private currentStep = 0;
    private answers: Partial<T> = {};
    private questions: Array<QuestionConfig<T>> = [];
    private config: CLIConfig<T> = {};

    // 链式配置方法
    configure(config: CLIConfig<T>): this {
        this.config = { ...this.config, ...config };
        return this;
    }

    // 链式添加问题
    addQuestion(question: QuestionConfig<T>): this {
        this.questions.push(question);
        return this;
    }

    // 链式添加多个问题
    addQuestions(questions: Array<QuestionConfig<T>>): this {
        this.questions.push(...questions);
        return this;
    }

    // 链式钩子注册
    beforeRun(hook: () => Promise<void>): this {
        this.config.hooks = {
            ...this.config.hooks,
            beforeRun: hook,
        };
        return this;
    }

    afterRun(hook: (answers: T) => Promise<void>): this {
        this.config.hooks = {
            ...this.config.hooks,
            afterRun: hook,
        };
        return this;
    }

    // 核心执行方法
    async run(): Promise<T> {
        await this.executeHook('beforeRun');

        while (this.currentStep < this.questions.length) {
            const question = this.getCurrentQuestion();
            const answer = await this.askQuestion(question);

            answer === '__BACK__' ? this.handleBack() : this.processAnswer(question, answer);
        }

        await this.executeHook('afterRun', this.answers as T);
        return this.answers as T;
    }

    private async executeHook<K extends keyof CLIConfig<T>['hooks']>(
        hookName: K,
        ...args: any[]
    ): Promise<void> {
        const hook = this.config.hooks?.[hookName];
        if (typeof hook === 'function') {
            // @ts-ignore
            await hook(...args);
        }
    }

    private getCurrentQuestion(): StaticQuestion<T> {
        const question = this.questions[this.currentStep];
        return typeof question === 'function' ? question(this.answers as T) : question;
    }
    private async askQuestion(question: StaticQuestion<T>): Promise<any> {
        const { [question.name]: answer } = await inquirer.prompt({
            ...question,
            message: `${question.message} ${chalk.dim('(输入 back 返回上一步)')}`,
            validate: (input: any) => {
                // 确保 validate 返回的是同步的 string | boolean
                const result = this.validateInput(input, question);
                return result;
            },
        });
        return answer === 'back' ? '__BACK__' : answer;
    }

    private validateInput(input: any, question: StaticQuestion<T>): string | boolean {
        if (input === 'back') return this.config.allowBack ?? true;

        // 确保 validate 是同步的
        if (question.validate) {
            const result = question.validate(input);
            if (result instanceof Promise) {
                throw new Error('validate 函数不能返回 Promise，请使用同步逻辑');
            }
            return result;
        }

        return true;
    }

    private handleBack(): void {
        if (this.currentStep > 0) {
            this.currentStep = Math.max(0, this.currentStep - (this.config.maxBackSteps ?? 1));
            console.log(chalk.grey(`↩ 已返回至第 ${this.currentStep + 1} 步`));
        }
    }

    private processAnswer(question: StaticQuestion<T>, answer: any): void {
        this.answers[question.name] = answer;
        this.currentStep++;
    }
}

// 使用示例
interface ProjectConfig {
    name: string;
    framework: 'react' | 'vue';
    features: string[];
}

new CLInteraction<ProjectConfig>()
    .configure({ maxBackSteps: 2 })
    .beforeRun(async () => {
        console.log(chalk.cyan('🚀 启动项目初始化向导'));
    })
    .addQuestion({
        type: 'input',
        name: 'name',
        message: '项目名称:',
        validate: (input: string) => !!input.trim() || '名称不能为空',
    })
    .addQuestion({
        type: 'list',
        name: 'framework',
        message: '选择框架:',
        choices: ['react', 'vue'],
    })
    .addQuestion((answers) => ({
        type: 'checkbox',
        name: 'features',
        message: `为 ${answers.framework} 选择功能:`,
        choices:
            answers.framework === 'react'
                ? ['TypeScript', 'Router', 'State Management']
                : ['TypeScript', 'Vuex', 'Vue Router'],
    }))
    .afterRun(async (answers) => {
        console.log(chalk.green('\n✅ 配置完成:'));
        console.log(answers);
    })
    .run()
    .catch(console.error);
