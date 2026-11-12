import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Lesson } from '#lib/types/lesson';

export const load: PageServerLoad = async ({ params }) => {
    const lesson = await Lesson.load(params.id);

	if (!lesson) {
        error(404, "That lesson can't be found. Did you type the URL manually? If so, try clicking 'Discover Topics' above and find it that way.");
	}

    let prerequisites = await lesson.prerequisites();
    let questions = await lesson.questions();

    return {
        lesson,
        questions,
        prerequisites,
    };
};

