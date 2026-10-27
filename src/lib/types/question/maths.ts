import { fetchMathsQuestionById } from "$lib/api/question.remote";
import { Question } from "$lib/types/question/question";
import { Answer } from "$lib/types/question/answer";
import { parse, compare } from "@khanacademy/kas";
import { evaluate, number, round } from "mathjs";
import { convertLatexToAsciiMath } from "mathlive";

export type GeneratedVariable = {
    name: string;
    value: string;
};

export class MathsQuestion extends Question<MathsAnswer> {
    readonly type: string = "maths";

    constructor(
        id: string,
        prompt: string,
        answer: MathsAnswer,
    ) {
        super(id, prompt, answer);
    }

    static async load(id: string): Promise<MathsQuestion | null> {
        return await fetchMathsQuestionById({ questionId: id });
    }
}

export class MathsAnswer extends Answer {
    constructor(
        public validAnswers: string[],
        public mathsHint: string | null,
        public mathsExplanation: string | null,
        public markingType: string,
    ) {
        super()
    }

    public display(): string {
        let displayAnswer = this.validAnswers[0];
        if (this.markingType === "approx") {
            displayAnswer = round(evaluate(displayAnswer), 2)
            .toString().replace(/\.0+$/, '') // remove trailing zeros;
        }
        displayAnswer = displayAnswer
            .replace("*", "\\times");
        return "$" + displayAnswer + "$";
    }

    public hint(): string | null {
        return this.mathsHint;
    }

    public explanation(): string | null {
        return this.mathsExplanation;
    }

    public isCorrect(studentAnswer: string): boolean {
        studentAnswer = convertLatexToAsciiMath(studentAnswer.slice(1, -1)); // remove $ signs
        if (this.markingType == "cas") {
            return this.isCorrectCas(studentAnswer);
        } else if (this.markingType == "approx") {
            return this.isValidApprox(studentAnswer);
        }
        throw new Error(`Unknown marking type: ${this.markingType}`);
    }

    public isCorrectCas(studentAnswer: string): boolean {
        const studentExpr = parse(studentAnswer).expr;
        for (const validAnswer of this.validAnswers) {
            let validAscii = convertLatexToAsciiMath(validAnswer);
            const answerExpr = parse(validAscii).expr;
            const result = compare(studentExpr, answerExpr, {
                form: true,
            });
            if (result.equal) {
                return true;
            }
        }
        return false;
    }

    public isValidApprox(studentAnswer: string): boolean {                                 
        const studentStr = String(studentAnswer).trim();                               
        if (!studentStr) return false;                                                 

        let studentNum: number;
        try {
            studentNum = number(studentStr) as number;                               
        } catch (e) {
            return false; // they didn't even type a number, so it's definitely wrong
        }
        const decimalPart = studentStr.split('.')[1];                                  
        const precision = decimalPart ? decimalPart.length : 0;                        

        for (let exactAnswer of this.validAnswers) {                                       
            const exactNum = number(String(exactAnswer)) as number;                        
            if (studentNum === round(exactNum, precision)) {                                  
                return true;                                                               
            }                                                                              
        }                                                                                  
        return false;                                                                      
    }

}

