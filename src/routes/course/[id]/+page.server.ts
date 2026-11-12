import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Course } from '#lib/types/curriculum';

export const load: PageServerLoad = async ({ params }) => {
    const course = await Course.load(params.id);

    if (!course) {
        error(404, "That course can't be found. Did you type the URL manually? If so, try clicking 'Discover Topics' above and find it that way.");
    }

    const topics = await course.topics();

    return {
        course,
        topics,
    };
};

