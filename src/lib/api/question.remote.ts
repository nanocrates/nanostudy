import { query } from '$app/server';
import { db } from '$lib/server/db';
import { basic_questions, multistep_questions, multistep_question_parts, maths_questions, multimaths_questions, multimaths_question_parts } from '$lib/server/db/schema';
import { BasicQuestion, Question, AnswerSubmissionResult, MultistepQuestion, MathsQuestion, Answer } from '$lib/types/question';
import { sql } from 'drizzle-orm';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';
import { BasicAnswer } from '$lib/types/question';
import { evaluateDerivedVariable, generateDerivedVariables, generateVariableValue, MathsQuestionTemplate } from '$lib/generator';
import { MultimathsQuestion } from '$lib/types/question/multimaths';
import type { GeneratedVariable, MathsAnswer } from '$lib/types/question/maths';

export const fetchBasicQuestionById = query(
    v.object({
        questionId: v.string(),
    }),
    async ({ questionId }): Promise<BasicQuestion | null> => {
        const basicQuestionData = await db.execute<typeof basic_questions.$inferSelect>(sql`
            SELECT *
            FROM ${basic_questions}
            WHERE ${basic_questions.id} = ${questionId}
        `);
        const bq = basicQuestionData[0];
        if (!bq) {
            return null;
        }

        return new BasicQuestion(
            bq.id,
            bq.prompt,
            new BasicAnswer(bq.answers, bq.hint, bq.explanation),
        );
    }
);

export const fetchMultistepQuestionById = query(
    v.object({
        questionId: v.string(),
    }),
    async ({ questionId }): Promise<MultistepQuestion | null> => {
        const multiStepData = await db.execute<typeof multistep_questions.$inferSelect>(sql`
            SELECT *
            FROM ${multistep_questions}
            WHERE ${multistep_questions.id} = ${questionId}
        `);
        const ms = multiStepData[0];
        if (!ms) {
            return null;
        }

        const partsData = await db.execute<typeof multistep_question_parts.$inferSelect>(sql`
            SELECT *
            FROM ${multistep_question_parts}
            WHERE ${multistep_question_parts.multistep_id} = ${questionId}
            ORDER BY ${multistep_question_parts.index} ASC
        `);

        const stepQuestions = await Promise.all(
            partsData.map((part) => Question.load(part.part_question_id))
        );

        const steps = stepQuestions.filter((q): q is Question => q !== null);

        return new MultistepQuestion(ms.id, ms.prompt, steps);
    }
);

export const fetchMathsQuestionTemplateById = query(
    v.object({
        questionId: v.string(),
    }),
    async ({ questionId }): Promise<MathsQuestionTemplate | null> => {
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
            data.answers,
            data.hint,
            data.explanation,
            data.marking_type || "cas",
        );
        return question;
    }
);

export const fetchMathsQuestionById = query(
    v.object({
        questionId: v.string(),
    }),
    async ({ questionId }): Promise<MathsQuestion | null> => {
        let template = await fetchMathsQuestionTemplateById({ questionId });
        if (!template) {
            return null;
        }
        return template.generate();
    }
);

export const fetchMultimathsQuestionById = query(
    v.object({
        questionId: v.string(),
        generatedVariables: v.optional(v.array(v.object({
            name: v.string(),
            value: v.string(),
        }))),
    }),
    async ({ questionId, generatedVariables }): Promise<MultimathsQuestion | null> => {
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
            [], null, null,
        );

        const partsData = await db.execute<typeof multimaths_question_parts.$inferSelect>(sql`
            SELECT *
            FROM ${multimaths_question_parts}
            WHERE ${multimaths_question_parts.multimaths_id} = ${questionId}
            ORDER BY ${multimaths_question_parts.index} ASC
        `);

        while (true) {
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
                console.log("Generated root question:", rootQuestion);

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
                            template = await fetchMultimathsQuestionById({
                                questionId: part.part_question_id,
                                generatedVariables: stepVariables,
                            });
                            if (!template) {
                                throw new Error(`Could not find question template for part question ID ${part.part_question_id}`);
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
                // Try again with different generated variables, in case the first attempt failed due to invalid derived variable values.
                // TODO: Optimise this so we don't have to query the database every time we retry.
                // I've mostly done this already, but we still need to query for the actual part data (as there's currently no *easy* way of getting the reusable templates)
                continue;
            }
            return new MultimathsQuestion(rootQuestion.id, rootQuestion.prompt, stepQuestions);
        }

    }
);

export const getQuestion = query(
    v.object({
        questionId: v.string(),
    }),
    async ({ questionId }): Promise<Question> => {
        const question = await Question.load(questionId);

        if (!question) { throw error(404, 'Question not found'); }

        return question;
    }
);

export const checkAnswer = query(
    v.object({
        questionId: v.string(),
        answerAttempt: v.string(),
    }),
    async ({ questionId, answerAttempt }): Promise<AnswerSubmissionResult> => {
        const question: Question | null = await Question.load(questionId);
        if (!question) { throw error(404, 'Question not found'); }
        if (!question.answer) { throw error(404, 'Question does not have an answer'); }

        const isCorrect: boolean = question.answer.isCorrect(answerAttempt);

        return new AnswerSubmissionResult(question, isCorrect, answerAttempt);
    }
);
