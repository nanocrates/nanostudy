import type { ConstrainedVariable, DerivedVariable } from "$lib/server/db/schema";
import { MathsQuestion } from "$lib/types/question";
import { MathsAnswer, type GeneratedVariable } from "$lib/types/question/maths";
import { parse, simplify } from "mathjs";
import { convertLatexToAsciiMath } from "mathlive";
import { simplifyAbnormalities } from "./simplify";

export class MathsQuestionTemplate {
    readonly type: string = "maths-template";

    constructor(
        public id: string,
        public prompt: string,
        public constrained: ConstrainedVariable[],
        public derived: DerivedVariable[],
        public answers: string[],
        public hint: string | null = null,
        public explanation: string | null = null,
        public markingEngine: string | null = null,
    ) {}

        public generateVariables(): GeneratedVariable[] {
            let wasSuccessful = true;
            while (true) {
                let variables: GeneratedVariable[] = [];
                for (const constrainedVariable of this.constrained) {
                    const generatedValue = generateVariableValue(constrainedVariable);
                    variables.push({
                        name: constrainedVariable.name,
                        value: generatedValue,
                    });
                }
                let derivedVariables;
                try {
                    derivedVariables = generateDerivedVariables(variables, this.derived);
                } catch (error) {
                    wasSuccessful = false;
                    continue;
                }
                variables.push(...derivedVariables);
                if (wasSuccessful) {
                    return variables;
                }
            }
        }

        public generate(variables?: GeneratedVariable[]): MathsQuestion {
            if (!variables || variables.length === 0) {
                variables = this.generateVariables();
            } else {
                variables = variables.concat(generateDerivedVariables(variables, this.derived));
            }

            let question = new MathsQuestion(
                this.id,
                this.prompt,
                new MathsAnswer(
                    [...this.answers], // HACK: Oh, this line... I have no idea why it's the same answer object across steps, but I guess it is. This seems to work - for now.
                    this.hint,
                    this.explanation,
                    this.markingEngine || "cas",
                )
            );

            question.prompt = insertVariablesIntoExpression(question.prompt, variables);
            for (let i = 0; i < question.answer.validAnswers.length; i++) {
                question.answer.validAnswers[i] = insertVariablesIntoExpression(question.answer.validAnswers[i], variables);
            }
            if (question.answer.mathsHint) {
                question.answer.mathsHint = insertVariablesIntoExpression(question.answer.mathsHint, variables);
            }
            if (question.answer.mathsExplanation) {
                question.answer.mathsExplanation = insertVariablesIntoExpression(question.answer.mathsExplanation, variables);
            }

            return question;
        }
}


export function generateDerivedVariables(variables: GeneratedVariable[], derived: DerivedVariable[]): GeneratedVariable[] {
    let derivedVariables: GeneratedVariable[] = [];
    for (const derivedVariable of derived) {
        derivedVariables.push(evaluateDerivedVariable(derivedVariable, variables));
    }
    return derivedVariables;
}

export function insertVariablesIntoExpression(expression: string, variables: GeneratedVariable[]): string {
    let expressionWithValues = expression;
    for (const variable of variables) {
        expressionWithValues = expressionWithValues.replaceAll(`[[${variable.name}]]`, "\{" + variable.value + "\}");
    }
    return simplifyAbnormalities(expressionWithValues);
}


export function evaluateDerivedVariable(derivedVariable: DerivedVariable, variables: GeneratedVariable[]): GeneratedVariable {
    const expressionWithValues = insertVariablesIntoExpression(derivedVariable.expression, variables);
    let asciiMathExpression = convertLatexToAsciiMath(expressionWithValues);
    
    asciiMathExpression = asciiMathExpression.replaceAll('∗', '*');

    if (asciiMathExpression.startsWith('((') && asciiMathExpression.endsWith('))')) {
        asciiMathExpression = asciiMathExpression
            .replace(/^\(\(/, '[[')
            .replace(/\)\)$/, ']]')
            .replaceAll('),(', '],[');
    }
    
    const parsedExpression = parse(asciiMathExpression);
    const evaluatedValue = simplify(parsedExpression).toString();

    if (evaluatedValue === "undefined" || evaluatedValue === "null" || evaluatedValue === Infinity.toString() || evaluatedValue === (-Infinity).toString()) {
        throw new Error(`Derived variable ${derivedVariable.name} evaluated to an invalid value: ${evaluatedValue}`, { cause: { derivedVariable, asciiMathExpression, evaluatedValue } });
    }
    
    return {
        name: derivedVariable.name,
        value: evaluatedValue,
    };
}


export function generateVariableValue(variable: ConstrainedVariable): string {
    let min = variable.min;
    let max = variable.max;
    let step = variable.step || 1;

    let generatedValue: number;
    do {
        const range = Math.floor((max - min) / step);
        const randomStep = Math.floor(Math.random() * (range + 1));
        generatedValue = min + randomStep * step;
    } while (variable.exclude && variable.exclude.includes(generatedValue));
    console.log(generatedValue.toString(), "generatedValue");

    return generatedValue.toString();
}
