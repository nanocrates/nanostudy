import { fetchBasicQuestionById } from "#lib/api/question.remote";
import { Question } from "#lib/types/question/question";
import { Answer } from "#lib/types/question/answer";

export class BasicQuestion extends Question {
    readonly type: string = "basic";

    constructor(
        id: string,
        prompt: string,
        answer: BasicAnswer,
    ) {
        super(id, prompt, answer);
    }

    static async load(id: string): Promise<BasicQuestion | null> {
        return await fetchBasicQuestionById({ questionId: id });
    }
}

export class BasicAnswer extends Answer {
    constructor(
        public validAnswers: string[],
        public basicHint: string | null,
        public basicExplanation: string | null,
    ) {
        super()
    }

    public display(): string {
        return this.validAnswers[0];
    }

    public hint(): string | null {
        return this.basicHint;
    }

    public explanation(): string | null {
        return this.basicExplanation;
    }

    public isCorrect(studentAnswer: string): boolean {
        let trimmedStudentAnswer = studentAnswer.trim();
        return this.validAnswers.includes(trimmedStudentAnswer);
    }
}

