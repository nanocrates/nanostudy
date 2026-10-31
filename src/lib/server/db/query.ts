import { db } from '$lib/server/db';
import { multimaths_questions, multimaths_question_parts, maths_questions } from '$lib/server/db/schema';
import { Question, Answer } from '$lib/types/question';
import { sql } from 'drizzle-orm';
import { evaluateDerivedVariable, MathsQuestionTemplate } from '$lib/generator';
import { MultimathsQuestion } from '$lib/types/question/multimaths';
import type { GeneratedVariable } from '$lib/types/question/maths';

export const fetchMathsQuestionTemplateById = async ({ questionId }: { questionId: string }): Promise<MathsQuestionTemplate | null> => {
    const [data] = await db.execute<typeof maths_questions.$inferSelect>(sql`
        SELECT *
        FROM ${maths_questions}
        WHERE ${maths_questions.id} = ${questionId}
    `);
    if (!data) {
        return null;
    }

    let question = new MathsQuestionTemplate(
        data.id,
        data.prompt,
        data.constrained,
        data.derived,
        data.constraints,
        data.answers,
        data.hint,
        data.explanation,
        data.marking_type || "cas",
    );
    return question;
}

export const fetchMultimathsQuestionByIdHandle = async ({ questionId, generatedVariables }: { questionId: string, generatedVariables?: GeneratedVariable[] }): Promise<MultimathsQuestion | null> => {
    const [multimathsData] = await db.execute<typeof multimaths_questions.$inferSelect>(sql`
          SELECT *
          FROM ${multimaths_questions}
          WHERE ${multimaths_questions.id} = ${questionId}
    `);
    if (!multimathsData) {
        return null;
    }

    let rootTemplate = new MathsQuestionTemplate(
        multimathsData.id,
        multimathsData.prompt,
        multimathsData.constrained,
        multimathsData.derived,
        multimathsData.constraints,
        [], null, null,
    );

    const partsData = await db.execute<typeof multimaths_question_parts.$inferSelect>(sql`
        SELECT *
        FROM ${multimaths_question_parts}
        WHERE ${multimaths_question_parts.multimaths_id} = ${questionId}
        ORDER BY ${multimaths_question_parts.index} ASC
    `);

    for (let attempt = 0; attempt < 20; attempt++) {
        let rootQuestion: Question<Answer>;
        let stepQuestions: Question<Answer>[];
        try {
            let variables: GeneratedVariable[];
            if (generatedVariables && generatedVariables.length > 0) {
                variables = [...generatedVariables];
            } else {
                variables = [...rootTemplate.generateVariables()];
            }
            rootQuestion = rootTemplate.generate(variables);

            stepQuestions = await Promise.all(
                partsData.map(async (part) => {
                    let stepVariables: GeneratedVariable[] = [...variables];
                    for (let [newVarName, expression] of Object.entries(part.variable_mapping)) {
                        let derivedVariable = {
                            name: newVarName,
                            expression: expression,
                        };
                        let generatedVariable = evaluateDerivedVariable(derivedVariable, variables);
                        stepVariables = stepVariables.filter(v => v.name !== newVarName);
                        stepVariables.push(generatedVariable);
                    }

                    let template: any = await fetchMathsQuestionTemplateById({ questionId: part.part_question_id });
                    if (!template) {
                        template = await fetchMultimathsQuestionByIdHandle({
                            questionId: part.part_question_id,
                            generatedVariables: stepVariables,
                        });
                        if (!template) {
                            throw new SyntaxError(`Could not find question template for part question ID ${part.part_question_id}`);
                        }
                    }

                    let question: Question;
                    if (template instanceof MathsQuestionTemplate) {
                        question = template.generate(stepVariables);
                    } else if (template instanceof MultimathsQuestion) {
                        question = template;
                    } else {
                        throw new Error(`Unsupported question type for part question ID ${part.part_question_id}`);
                    }
                    return question;
                })
            );
        } catch (error) {
            // Is there an actual problem with the question template?
            if (error instanceof SyntaxError) {
                throw new SyntaxError(`Syntax error in derived variable expression for multimaths question ${questionId}: ${error.message}`);
            }
            console.log("error in main query:", error);
            // Otherwise, try again with different generated variables, in case the first attempt failed due to invalid derived variable values.
            // TODO: Optimise this so we don't have to query the database every time we retry.
            // I've mostly done this already, but we still need to query for the actual part data (as there's currently no *easy* way of getting the reusable templates)
            // LOG: console.log(`Error generating multimaths question ${questionId}:`, error);
            continue;
        }
        // LOG: console.log(`Successfully generated multimaths question ${questionId} with ${stepQuestions.length} steps`);
        return new MultimathsQuestion(rootQuestion.id, rootQuestion.prompt, stepQuestions);
    }
    throw new Error(`Failed to generate valid multimaths question ${questionId} after 20 attempts.`);
}
