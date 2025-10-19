import { Question } from '@lania-cli/types';
import { CliInteraction } from '../lib';

export const simplePromptInteraction = async (questions: Question[] | Question) => {
    return await new CliInteraction()
        .addQuestions(Array.isArray(questions) ? questions : [questions])
        .execute();
};
