import { fetchCourseById, fetchLessonsByCourseId, fetchLessonsByCourseIdAndTopicId, fetchCourseTopicsByCourseId, fetchCourses, fetchCourseTopicByCourseIdAndTopicId } from '#lib/api/curriculum.remote';

export class Course {
    constructor(
        public id: string,
        public title: string,
        public level: string | null,
        public examBoard: string | null,
        public gradeScale: string | null,
    ) {}

    async topics() {
        return await fetchCourseTopicsByCourseId({ courseId: this.id });
    }

    async lessons() {
        return await fetchLessonsByCourseId({ courseId: this.id });
    }

    static async load(id: string): Promise<Course> {
        return await fetchCourseById({ courseId: id });
    }

    static async all() {
        return await fetchCourses();
    }
}

export class CourseTopic {
    constructor(
        public topicId: string,
        public courseId: string,
        public title: string,
        public index: number,
    ) {}

    async lessons() {
        return await fetchLessonsByCourseIdAndTopicId({ topicId: this.topicId, courseId: this.courseId });
    }

    static async load(topicId: string, courseId: string) {
        return await fetchCourseTopicByCourseIdAndTopicId({ topicId, courseId });
    }
}

