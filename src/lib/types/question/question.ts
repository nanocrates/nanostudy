import type { Answer } from "./answer";

export abstract class Question<T extends Answer = Answer> {
    public abstract readonly type: string;
    constructor(
        public id: string,
        public prompt: string,
        public answer: T,
    ) {}

    static async load(id: string): Promise<Question | null> {
        const { BasicQuestion } = await import("./basic");
        let question = await BasicQuestion.load(id); 
        if (question) return question; 

        const { ClozeQuestion } = await import("./cloze");
        question = await ClozeQuestion.load(id); 
        if (question) return question; 

        const { MultistepQuestion } = await import("./multistep");
        question = await MultistepQuestion.load(id); 
        if (question) return question; 

        const { MathsQuestion } = await import("./maths");
        question = await MathsQuestion.load(id); 
        if (question) return question; 

        const { MultimathsQuestion } = await import("./multimaths");
        question = await MultimathsQuestion.load(id); 
        if (question) return question;

        return null; 
    }

    static async example(): Promise<Question | null> {
        return Question.load("example-question");
    }
}

