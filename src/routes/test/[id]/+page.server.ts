import { Lesson } from "#lib/types/lesson"

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Question } from '#lib/types/question';

export const load: PageServerLoad = async ({ params }) => {
    const lesson = await Lesson.load(params.id);

    if (!lesson) {
	error(404, "That lesson can't be found, so you can't take a test on it. Did you type the URL manually? If so, try clicking 'Discover Topics' above and find it that way.");
    }

    let allQuestions: Question[] = await lesson.questions();
    let questionIds: string[] = allQuestions.map(x => x.id);
    let totalMarks: number = questionIds.length; // TODO: add mark counter

    return {
	lesson,
	questionIds,
	totalMarks,
    };
};

