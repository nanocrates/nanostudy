import { fetchClozeQuestionById } from "$lib/api/question.remote";
import { Question } from "$lib/types/question/question";
import { Answer } from "$lib/types/question/answer";

export class ClozeQuestion extends Question {
    readonly type: string = "cloze";

    constructor(
        id: string,
        prompt: string,
        answer: ClozeAnswer,
    ) {
        super(id, prompt, answer);
    }

    static async load(id: string): Promise<ClozeQuestion | null> {
        return await fetchClozeQuestionById({ questionId: id });
    }
}

export class ClozeAnswer extends Answer {
    constructor(
        public answerBoxes: string[][], // [box][option]
        public clozeHint: string | null,
        public clozeExplanation: string | null,
    ) {
        super()
    }

    public display(): string {
        let displayedAnswer = "";
        for (let validAnswer of this.answerBoxes) {
            displayedAnswer += validAnswer[0] + "; ";
        }
        displayedAnswer = displayedAnswer.endsWith("; ") ? displayedAnswer.slice(0, -2) : displayedAnswer;
        return displayedAnswer;
    }

    public hint(): string | null {
        return this.clozeHint;
    }

    public explanation(): string | null {
        return this.clozeExplanation;
    }

    public isCorrect(studentAnswer: string): boolean {
        let studentAnswers = studentAnswer.trim().split("; ")
        for (let i = 0; i < studentAnswers.length; i++) {
            console.log(this.answerBoxes[i], "correct");
            console.log(studentAnswers[i], "attempt");
            console.log(this.answerBoxes[i].includes(studentAnswers[i]));
            if (!this.answerBoxes[i].includes(studentAnswers[i])) return false;
        }
        return true;
    }
}

