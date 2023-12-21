import { Question } from 'inquirer';

type CreateQuestionOptions = Exclude<
    Question & {
        hide?: boolean;
        choices?:
            | (string | boolean | number)[]
            | ((options: Record<string, any>) => (string | boolean | number)[]);
    },
    'type'
>;

export const createConfirmQuestion = (options: CreateQuestionOptions) => {
    return {
        ...options,
        type: 'confirm',
    };
};

export const createListQuestion = (options: CreateQuestionOptions) => {
    return {
        ...options,
        type: 'list',
    };
};

export const createCheckboxQuestion = (options: CreateQuestionOptions) => {
    return {
        ...options,
        type: 'checkbox',
    };
};

export const createInputQuestion = (options: CreateQuestionOptions) => {
    return {
        ...options,
        type: 'input',
    };
};
