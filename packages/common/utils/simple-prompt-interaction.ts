import { Question } from '@lania-cli/types';
import { CliInteraction } from '../lib/cli-interaction';

export const simplePromptInteraction = async (questions: Question[] | Question) => {
    return await new CliInteraction()
        .addQuestions(Array.isArray(questions) ? questions : [questions])
        .execute();
};
