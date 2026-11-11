import type { Transport } from '@sveltejs/kit';
import { Course, CourseTopic } from '$lib/types/curriculum';
import { Lesson } from '$lib/types/lesson';
import { Question, Answer, BasicQuestion, BasicAnswer, ClozeQuestion, ClozeAnswer, MultistepQuestion, AnswerSubmissionResult, MathsQuestion } from '$lib/types/question';
import { MathsQuestionTemplate } from '$lib/generator';
import { MathsAnswer } from '$lib/types/question/maths';
import { MultimathsQuestion } from '$lib/types/question/multimaths';

const models: Record<string, any> = {
    Course,
    CourseTopic,
    Lesson,
    Question,
    Answer,
    BasicAnswer,
    BasicQuestion,
    ClozeQuestion,
    ClozeAnswer,
    MultistepQuestion,
    MathsQuestion,
    MathsQuestionTemplate,
    MultimathsQuestion,
    MathsAnswer,
    AnswerSubmissionResult,
};

export const transport: Transport = {
    Model: {
        encode: (v: any) => v?.constructor?.name in models && [v.constructor.name, { ...v }],
        decode: ([name, data]: [string, any]) => {
            const Cls = models[name];
            return Cls ? Object.assign(Object.create(Cls.prototype), data) : data;
        }
    }
};
