import { fetchMultistepQuestionById } from "#lib/api/question.remote";
import { Question } from ".";

export class MultistepQuestion extends Question {
    readonly type: string = "multistep";
    public steps: Question[];

    constructor(
        id: string,
        prompt: string,
        steps: Question[],
    ) {
        if (steps.length === 0) {
            throw new Error("MultistepQuestion must have at least one step.");
        }
        let answer = steps[steps.length - 1].answer;
        super(id, prompt, answer);
        this.steps = steps;
    }

    static async load(id: string): Promise<MultistepQuestion | null> {
        return await fetchMultistepQuestionById({ questionId: id });
    }
}
