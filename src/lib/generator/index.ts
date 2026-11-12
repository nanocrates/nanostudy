import type { ConstrainedVariable, DerivedVariable } from "#lib/server/db/schema";
import { MathsQuestion } from "#lib/types/question";
import { MathsAnswer, type GeneratedVariable } from "#lib/types/question/maths";
import { evaluate, simplify } from "@cortex-js/compute-engine";
import { parseTex, simplifyAbnormalities } from "./simplify";

export class MathsQuestionTemplate {
    readonly type: string = "maths-template";

    constructor(
        public id: string,
        public prompt: string,
        public constrained: ConstrainedVariable[],
        public derived: DerivedVariable[],
        public constraints: string[],
        public answers: string[],
        public hint: string | null = null,
        public explanation: string | null = null,
        public markingEngine: string | null = null,
    ) {}

        public generateVariables(): GeneratedVariable[] {
            for (let attempt = 0; attempt < 30; attempt++) {
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
                    console.log("Error generating derived variables, retrying...", error);
                    continue;
                }
                variables.push(...derivedVariables);
                for (const constraint of this.constraints) {
                    try {
                        validateConstraint(constraint, variables);
                    } catch (error) {
                        console.log("Constraint validation failed, retrying...", error);
                        continue;
                    }
                }
                return variables;
            }
            throw new Error(`Failed to generate valid variables for question ${this.id} after 30 attempts.`);
        }

        public generate(variables?: GeneratedVariable[]): MathsQuestion {
            if (!variables || variables.length === 0) {
                variables = this.generateVariables();
            } else {
                variables = variables.concat(generateDerivedVariables(variables, this.derived));
            }
            for (const constraint of this.constraints) {
                validateConstraint(constraint, variables);
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


export function validateConstraint(constraint: string, variables: GeneratedVariable[]): void {
    let evaluatedValue: string;
    try {
        let expressionWithValues = insertVariablesIntoExpression(constraint, variables);
        let parsedExpression = parseTex(expressionWithValues);
        evaluatedValue = evaluate(parsedExpression).toNumericValue().toString();
        console.log(evaluatedValue, "evaluatedValue in constraint")
    } catch (error) {
        console.error(`Schema error evaluating constraint ${constraint} with variables ${JSON.stringify(variables)}: ${error}`);
        throw new SyntaxError("Constraint is syntactically invalid: " + error);
    }
    if (evaluatedValue == "0") {
        console.log(`Constraint ${constraint} evaluated to false with variables ${JSON.stringify(variables)}. Evaluated value: ${evaluatedValue}`);
        throw new Error(`Constraint ${constraint} evaluated to false with variables ${JSON.stringify(variables)}. Evaluated value: ${evaluatedValue}`);
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
    const value = simplify(expressionWithValues);

    return {
        name: derivedVariable.name,
        value: value.toLatex(),
    };
}


export function generateVariableValue(variable: ConstrainedVariable): string {
    let min = variable.min;
    let max = variable.max;
    let step = variable.step || 1;

    let generatedValue: number;
    if (!variable.exclude) {
        variable.exclude = [];
    }
    for (let attempt = 0; attempt < 30; attempt++) {
        const range = Math.floor((max - min) / step);
        const randomStep = Math.floor(Math.random() * (range + 1));
        generatedValue = min + randomStep * step;
        if (!variable.exclude.includes(generatedValue)) {
            return generatedValue.toString();
        }
    }

    throw new Error(`Failed to generate a valid value for variable ${variable.name} after 30 attempts.`);
}
