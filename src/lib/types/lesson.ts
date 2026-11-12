import { fetchLessonById, fetchLessonPrerequisitesByLessonId, fetchQuestionsByLessonId } from "#lib/api/lesson.remote";
import type { Question } from "./question";

export class Lesson {
    constructor(
        public id: string,
        public title: string,
        public readContent: string | null,
    ) {}

    static async load(lessonId: string) {
        const lessonData = await fetchLessonById({ lessonId });
        if (!lessonData) {
            throw new Error(`Lesson with ID ${lessonId} not found`);
        }
        return new Lesson(
            lessonData.id,
            lessonData.title,
            lessonData.readContent,
        );
    }

    async prerequisites(): Promise<Lesson[]> {
        return await fetchLessonPrerequisitesByLessonId({ lessonId: this.id });
    }

    async questions(): Promise<Question[]> {
        return await fetchQuestionsByLessonId({ lessonId: this.id });
    }
}

