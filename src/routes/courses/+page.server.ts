import { Course } from "#lib/types/curriculum";

export async function load() {
    return { 
        courses: await Course.all(),
    };
}
