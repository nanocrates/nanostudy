// scripts/validate-content.ts
import { createServer } from 'vite';
import type { MathsQuestionTemplate } from '../src/lib/generator';

const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
});

const { db } = await vite.ssrLoadModule("/src/lib/server/db");
const { maths_questions, multimaths_questions } = await vite.ssrLoadModule("/src/lib/server/db/schema");
const { fetchMathsQuestionTemplateById, fetchMultimathsQuestionByIdHandle } = await vite.ssrLoadModule("/src/lib/server/db/query");

export async function getAllMathsQuestionTemplates(): Promise<MathsQuestionTemplate[]> {
    const mathsQuestionsData = await db.select().from(maths_questions);

    return Promise.all(
        mathsQuestionsData.map(async (q: typeof maths_questions.$inferSelect) => {
            const template = await fetchMathsQuestionTemplateById({ questionId: q.id });
            return template;
        })
    );
}

export async function validateAllMultimathsQuestions() {
    const multimathsQuestionData = await db.select().from(multimaths_questions);
    for (const q of multimathsQuestionData) {
        //console.log(`Validating multimaths question ID: ${q.id}`);
        try {
            const question = await fetchMultimathsQuestionByIdHandle({ questionId: q.id });
        } catch (error: any) {
            console.log("FAILED to validate multimaths question with id: " + q.id, error.message);
        }
    }
}

export async function validateAllMathsQuestions() {
    const mathsQuestionTemplates = await getAllMathsQuestionTemplates();
    for (const template of mathsQuestionTemplates) {
        //console.log(`Validating ID: ${template.id}`);
        try {
            const question = template.generate();
        } catch (error: any) {
            console.log("FAILED to validate question template with id: " + template.id, error.message);
        }
    }
}

export async function validateAllQuestions() {
    await validateAllMathsQuestions();
    await validateAllMultimathsQuestions();
}

validateAllQuestions().then(async () => {
    console.log("Validation complete");
    await vite.close();
    process.exit(0);
}).catch(async (error) => {
    console.log("Error during validation:", error);
    await vite.close();
    process.exit(1);
});
