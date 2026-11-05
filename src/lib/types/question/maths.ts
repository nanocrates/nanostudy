import { fetchMathsQuestionById } from "$lib/api/question.remote";
import { Question } from "$lib/types/question/question";
import { Answer } from "$lib/types/question/answer";
import { evaluate, number, round } from "mathjs";
import { parse } from "@cortex-js/compute-engine"
import { parseTex } from "$lib/generator/simplify";

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
        studentAnswer = studentAnswer.slice(1, -1); // remove $ signs
        if (this.markingType == "cas") {
            return this.isCorrectCas(studentAnswer);
        } else if (this.markingType == "identity") {
            return this.isCorrectCas(studentAnswer, false);
        } else if (this.markingType == "approx") {
            return this.isValidApprox(studentAnswer);
        }
        throw new Error(`Unknown marking type: ${this.markingType}`);
    }

    public isCorrectCas(studentAnswer: string, requireForm: boolean = true): boolean {
        const studentExpr = parse(studentAnswer);
        if (studentExpr == undefined || studentExpr == null) {
            console.log("Failed to parse student answer, their raw latex answer was", studentAnswer);
        }
        for (const validAnswer of this.validAnswers) {
            let validExpr = parseTex(validAnswer);
            console.log(`Checking student answer (raw was '${studentAnswer}') against valid answer (raw is '${validAnswer}')`);
            console.log(validExpr);
            if (!requireForm) {
                const identityResult = studentExpr.isIdenticallyEqual(validExpr);
                if (identityResult) return true;
            } else {
                const formResult = studentExpr.isSame(validExpr);
                if (formResult) return true;
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

