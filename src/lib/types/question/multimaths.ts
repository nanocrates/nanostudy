import { fetchMultimathsQuestionById } from "#lib/api/question.remote";
import { Answer, Question } from ".";
import type { MathsAnswer } from "./maths";

export class MultimathsQuestion extends Question<Answer> {
    readonly type: string = "multimaths";
    public steps: Question[];

    constructor(
        id: string,
        prompt: string,
        steps: Question<Answer>[],
    ) {
        if (steps.length === 0) {
            throw new Error("MultimathsQuestion must have at least one step.");
        }
        let answer = steps[steps.length - 1].answer;
        super(id, prompt, answer);
        this.steps = steps;
    }

    static async load(id: string): Promise<MultimathsQuestion | null> {
        return await fetchMultimathsQuestionById({ questionId: id });
    }

}
