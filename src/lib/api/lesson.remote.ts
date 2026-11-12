import { query } from '$app/server';
import { db } from '#lib/server/db';
import { lesson_questions, lessons, basic_questions } from '#lib/server/db/schema';
import { Lesson } from '#lib/types/lesson';
import { Answer, BasicQuestion, Question } from '#lib/types/question';
import { sql, inArray } from 'drizzle-orm';
import { error } from "@sveltejs/kit"
import * as v from 'valibot';

export const fetchLessonById = query(
    v.object({
        lessonId: v.string(),
    }),
    async ({ lessonId }): Promise<Lesson | null> => {
        const data = await db.execute<typeof lessons.$inferSelect>(sql`
                                SELECT *
                                FROM ${lessons}
                                WHERE ${lessons.id} = ${lessonId}
                                `);
        const lessonData = data[0];
        if (!lessonData) {
            return null;
        }

        return new Lesson(
            lessonData.id,
            lessonData.title,
            lessonData.read_content,
        );
    }
)

export const fetchQuestionsByLessonId = query(
    v.object({
        lessonId: v.string(),
    }),
    async ({ lessonId }): Promise<Question[]> => {
        const questionIds = await db.execute<{question_id: string}>(sql`
            SELECT lq.question_id
            FROM ${lesson_questions} lq
            WHERE lq.lesson_id = ${lessonId}
        `);

        return await Promise.all(questionIds.map(async (bq) => {
            let question = await Question.load(bq.question_id);
            if (!question) error(500, "This lesson in the database contains an entry which points to a non-existent question. Please report this to report@nanostudy.co.uk");
            return question;
        }));
    }
);

export const fetchLessonPrerequisitesByLessonId = query(
    v.object({
        lessonId: v.string(),
    }),
    async ({ lessonId }): Promise<Lesson[]> => {
        const rows = await db.execute<{ prerequisites: string[] | null }>(sql`
            SELECT prerequisites
            FROM ${lessons}
            WHERE id = ${lessonId}
        `);

        const prereqIds = rows[0]?.prerequisites;

        if (!prereqIds || prereqIds.length === 0) {
            return [];
        }

        const data = await db.execute<typeof lessons.$inferSelect>(sql`
            SELECT *
            FROM ${lessons}
            WHERE ${inArray(lessons.id, prereqIds)}
        `);

        return data.map((row) => new Lesson(
            row.id,
            row.title,
            row.read_content,
        ));
    }
);
