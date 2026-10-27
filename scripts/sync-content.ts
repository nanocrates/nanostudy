import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { and, eq, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import JSON5 from 'json5';

import * as schema from '../src/lib/server/db/schema';
import type { ConstrainedVariable, DerivedVariable } from '../src/lib/server/db/schema';

export type QuestionType = 'basic' | 'maths' | 'multistep' | 'multimaths';

export interface BasicQuestionDef {
  type: 'basic';
  id: string;
  prompt: string;
  answers?: string[];
  hint?: string | null;
  explanation?: string | null;
}

export interface MathsQuestionDef {
  type: 'maths';
  id: string;
  prompt: string;
  constrained?: ConstrainedVariable[];
  derived?: DerivedVariable[];
  answers: string[];
  hint?: string | null;
  explanation?: string | null;
  marking_type?: string | null;
}

export interface MultistepPartDef {
  index: number;
  question: string | BasicQuestionDef | MathsQuestionDef | MultistepQuestionDef;
}

export interface MultistepQuestionDef {
  type: 'multistep';
  id: string;
  prompt: string;
  parts: MultistepPartDef[];
}

export interface MultimathsPartDef {
  index: number;
  variable_mapping?: Record<string, string>;
  question: string | MathsQuestionDef | MultimathsQuestionDef;
}

export interface MultimathsQuestionDef {
  type: 'multimaths';
  id: string;
  prompt: string;
  constrained?: ConstrainedVariable[];
  derived?: DerivedVariable[];
  parts: MultimathsPartDef[];
}

export type QuestionDef =
  | BasicQuestionDef
  | MathsQuestionDef
  | MultistepQuestionDef
  | MultimathsQuestionDef;

export interface LessonDef {
  id: string;
  title: string;
  read_content?: string | null;
  prerequisites?: string[];
  questions?: (string | QuestionDef)[];
}

export interface TopicDef {
  topic_id: string;
  title: string;
  index: number;
  lessons?: (string | LessonDef)[];
}

export interface CourseDef {
  id: string;
  title: string;
  level?: string | null;
  exam_board?: string | null;
  grade_scale?: string | null;
  topics?: TopicDef[];
}

export interface ContentPayload {
  courses?: CourseDef[];
  lessons?: LessonDef[];
  questions?: QuestionDef[];
}

config({ path: '.env' });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({ client, schema });

const BATCH_SIZE = 500;

function canonicalHash(obj: unknown): string {
  const stringifyDeterministic = (val: any): string => {
    if (val === null || typeof val !== 'object') {
      return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      return `[${val.map(stringifyDeterministic).join(',')}]`;
    }
    const sortedKeys = Object.keys(val).sort();
    const keyValues = sortedKeys.map(
      (k) => `${JSON.stringify(k)}:${stringifyDeterministic(val[k])}`
    );
    return `{${keyValues.join(',')}}`;
  };

  return createHash('sha256').update(stringifyDeterministic(obj)).digest('hex');
}

const stores = {
  courses: new Map<string, typeof schema.courses.$inferInsert>(),
  course_topics: new Map<string, typeof schema.course_topics.$inferInsert>(),
  lessons: new Map<string, typeof schema.lessons.$inferInsert>(),
  topic_lessons: new Map<string, typeof schema.topic_lessons.$inferInsert>(),
  basic_questions: new Map<string, typeof schema.basic_questions.$inferInsert>(),
  maths_questions: new Map<string, typeof schema.maths_questions.$inferInsert>(),
  multistep_questions: new Map<string, typeof schema.multistep_questions.$inferInsert>(),
  multistep_question_parts: new Map<string, typeof schema.multistep_question_parts.$inferInsert>(),
  multimaths_questions: new Map<string, typeof schema.multimaths_questions.$inferInsert>(),
  multimaths_question_parts: new Map<string, typeof schema.multimaths_question_parts.$inferInsert>(),
  lesson_questions: new Map<string, typeof schema.lesson_questions.$inferInsert>(),
};

function processQuestion(q: string | QuestionDef): string {
  if (typeof q === 'string') return q;
  if (!q || !q.type) throw new Error(`Invalid question definition: ${JSON.stringify(q)}`);

  switch (q.type) {
    case 'basic':
      stores.basic_questions.set(q.id, {
        id: q.id,
        prompt: q.prompt,
        answers: q.answers ?? [],
        hint: q.hint ?? null,
        explanation: q.explanation ?? null,
      });
      break;

    case 'maths':
      stores.maths_questions.set(q.id, {
        id: q.id,
        prompt: q.prompt,
        constrained: q.constrained ?? [],
        derived: q.derived ?? [],
        answers: q.answers,
        hint: q.hint ?? null,
        explanation: q.explanation ?? null,
        marking_type: q.marking_type ?? null,
      });
      break;

      case 'multistep':
      stores.multistep_questions.set(q.id, {
        id: q.id,
        prompt: q.prompt,
      });
      q.parts.forEach((part) => {
        const partId = processQuestion(part.question);
        const compositeKey = `${q.id}:${part.index}`;
        stores.multistep_question_parts.set(compositeKey, {
          multistep_id: q.id,
          part_question_id: partId,
          index: part.index,
        });
      });
      break;

    case 'multimaths':
      stores.multimaths_questions.set(q.id, {
        id: q.id,
        prompt: q.prompt,
        constrained: q.constrained ?? [],
        derived: q.derived ?? [],
      });
      q.parts.forEach((part) => {
        if (!part.question) throw new Error(`Multimaths part for question ${q.id} is missing a question definition for part index ${part.index}`);
        const partId = processQuestion(part.question);
        const compositeKey = `${q.id}:${part.index}`;
        stores.multimaths_question_parts.set(compositeKey, {
          multimaths_id: q.id,
          part_question_id: partId,
          variable_mapping: part.variable_mapping ?? {},
          index: part.index,
        });
      });
      break;
  }
  return q.id;
}

function processLesson(
  lesson: string | LessonDef,
  courseId?: string,
  topicId?: string
): string {
  if (typeof lesson === 'string') {
    if (courseId && topicId) {
      const compositeKey = `${courseId}:${topicId}:${lesson}`;
      stores.topic_lessons.set(compositeKey, {
        course_id: courseId,
        topic_id: topicId,
        lesson_id: lesson,
      });
    }
    return lesson;
  }

  stores.lessons.set(lesson.id, {
    id: lesson.id,
    title: lesson.title,
    read_content: lesson.read_content ?? null,
    prerequisites: lesson.prerequisites ?? [],
  });

  if (courseId && topicId) {
    const compositeKey = `${courseId}:${topicId}:${lesson.id}`;
    stores.topic_lessons.set(compositeKey, {
      course_id: courseId,
      topic_id: topicId,
      lesson_id: lesson.id,
    });
  }

  if (lesson.questions) {
    for (const q of lesson.questions) {
      const qId = processQuestion(q);
      const compositeKey = `${lesson.id}:${qId}`;
      stores.lesson_questions.set(compositeKey, {
        lesson_id: lesson.id,
        question_id: qId,
      });
    }
  }

  return lesson.id;
}

function processTopic(topic: TopicDef, courseId: string) {
  const compositeKey = `${topic.topic_id}:${courseId}`;
  stores.course_topics.set(compositeKey, {
    topic_id: topic.topic_id,
    course_id: courseId,
    title: topic.title,
    index: topic.index,
  });

  if (topic.lessons) {
    for (const lesson of topic.lessons) {
      processLesson(lesson, courseId, topic.topic_id);
    }
  }
}

function processCourse(course: CourseDef) {
  stores.courses.set(course.id, {
    id: course.id,
    title: course.title,
    level: course.level ?? null,
    exam_board: course.exam_board ?? null,
    grade_scale: course.grade_scale ?? null,
  });

  if (course.topics) {
    for (const topic of course.topics) {
      processTopic(topic, course.id);
    }
  }
}

function normalizePayload(payload: ContentPayload) {
  if (payload.questions) payload.questions.forEach(processQuestion);
  if (payload.lessons) payload.lessons.forEach((l) => processLesson(l));
  if (payload.courses) payload.courses.forEach(processCourse);
}

interface SyncConfig<T> {
  tableName: string;
  table: any;
  incomingItems: T[];
  primaryKeys: (keyof T)[];
}

function getCompositeStringKey<T>(item: T, primaryKeys: (keyof T)[]): string {
  return primaryKeys.map((pk) => String(item[pk])).join(':::');
}

async function computeDiff<T extends Record<string, any>>(config: SyncConfig<T>) {
  const { table, incomingItems, primaryKeys } = config;

  const dbRows = await db.select().from(table);

  const dbMap = new Map<string, T>();
  for (const row of dbRows) {
    dbMap.set(getCompositeStringKey(row, primaryKeys), row as T);
  }

  const incomingMap = new Map<string, T>();
  for (const item of incomingItems) {
    incomingMap.set(getCompositeStringKey(item, primaryKeys), item);
  }

  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  let skipped = 0;

  for (const [key, incomingItem] of incomingMap.entries()) {
    const existing = dbMap.get(key);
    if (!existing) {
      toInsert.push(incomingItem);
    } else {
      const existingHash = canonicalHash(existing);
      const incomingHash = canonicalHash({ ...existing, ...incomingItem });

      if (existingHash !== incomingHash) {
        toUpdate.push(incomingItem);
      } else {
        skipped++;
      }
    }
  }

  const toDelete: T[] = [];
  for (const [key, dbItem] of dbMap.entries()) {
    if (!incomingMap.has(key)) {
      toDelete.push(dbItem);
    }
  }

  return { toInsert, toUpdate, toDelete, skipped };
}

async function applyUpserts<T extends Record<string, any>>(
  config: SyncConfig<T>,
  diff: { toInsert: T[]; toUpdate: T[] }
) {
  const { tableName, table, primaryKeys } = config;
  const { toInsert, toUpdate } = diff;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE);
    await db.insert(table).values(chunk);
  }

  for (const item of toUpdate) {
    const whereConditions = primaryKeys.map((pk) =>
      eq(table[pk as string], item[pk])
    );
    await db
      .update(table)
      .set(item)
      .where(and(...whereConditions));
  }

  if (toInsert.length > 0 || toUpdate.length > 0) {
    console.log(`[${tableName}] Upserts -> Inserted: ${toInsert.length} | Updated: ${toUpdate.length}`);
  }
}

async function applyDeletions<T extends Record<string, any>>(
  config: SyncConfig<T>,
  toDelete: T[]
) {
  const { tableName, table, primaryKeys } = config;

  if (toDelete.length === 0) return;

  if (primaryKeys.length === 1) {
    const pk = primaryKeys[0] as string;
    const deleteIds = toDelete.map((item) => item[pk]);

    for (let i = 0; i < deleteIds.length; i += BATCH_SIZE) {
      const chunk = deleteIds.slice(i, i + BATCH_SIZE);
      await db.delete(table).where(inArray(table[pk], chunk));
    }
  } else {
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const chunk = toDelete.slice(i, i + BATCH_SIZE);
      const conditions = chunk.map((item) =>
        and(...primaryKeys.map((pk) => eq(table[pk as string], item[pk])))
      );
      await db.delete(table).where(or(...conditions));
    }
  }

  console.log(`[${tableName}] Prune -> Deleted: ${toDelete.length} removed items`);
}

async function runSync() {
  const startTime = Date.now();
  const filePath = resolve(process.cwd(), process.argv[2] || 'content.json');
  console.log(`Loading content from ${filePath}...`);

  const fileData = readFileSync(filePath, 'utf-8');
  const payload: ContentPayload = JSON5.parse(fileData);

  normalizePayload(payload);

  console.log('Calculating diffs against database...\n');

  const configs: SyncConfig<any>[] = [
    { tableName: 'courses', table: schema.courses, incomingItems: Array.from(stores.courses.values()), primaryKeys: ['id'] },
    { tableName: 'course_topics', table: schema.course_topics, incomingItems: Array.from(stores.course_topics.values()), primaryKeys: ['topic_id', 'course_id'] },
    { tableName: 'lessons', table: schema.lessons, incomingItems: Array.from(stores.lessons.values()), primaryKeys: ['id'] },
    { tableName: 'topic_lessons', table: schema.topic_lessons, incomingItems: Array.from(stores.topic_lessons.values()), primaryKeys: ['course_id', 'topic_id', 'lesson_id'] },

    { tableName: 'basic_questions', table: schema.basic_questions, incomingItems: Array.from(stores.basic_questions.values()), primaryKeys: ['id'] },
    { tableName: 'maths_questions', table: schema.maths_questions, incomingItems: Array.from(stores.maths_questions.values()), primaryKeys: ['id'] },
    { tableName: 'multistep_questions', table: schema.multistep_questions, incomingItems: Array.from(stores.multistep_questions.values()), primaryKeys: ['id'] },
    { tableName: 'multimaths_questions', table: schema.multimaths_questions, incomingItems: Array.from(stores.multimaths_questions.values()), primaryKeys: ['id'] },

    { tableName: 'multistep_question_parts', table: schema.multistep_question_parts, incomingItems: Array.from(stores.multistep_question_parts.values()), primaryKeys: ['multistep_id', 'index'] },
    { tableName: 'multimaths_question_parts', table: schema.multimaths_question_parts, incomingItems: Array.from(stores.multimaths_question_parts.values()), primaryKeys: ['multimaths_id', 'index'] },
    { tableName: 'lesson_questions', table: schema.lesson_questions, incomingItems: Array.from(stores.lesson_questions.values()), primaryKeys: ['lesson_id', 'question_id'] },
  ];

  const diffMap = new Map();
  for (const cfg of configs) {
    const diff = await computeDiff(cfg);
    diffMap.set(cfg.tableName, diff);
    console.log(`[${cfg.tableName}] Skipped (Unchanged): ${diff.skipped}`);
  }

  console.log('\nApplying insertions and updates (Top-Down)...');
  for (const cfg of configs) {
    const diff = diffMap.get(cfg.tableName);
    await applyUpserts(cfg, diff);
  }

  console.log('\nPruning removed entities (Bottom-Up)...');
  const reverseConfigs = [...configs].reverse();
  for (const cfg of reverseConfigs) {
    const diff = diffMap.get(cfg.tableName);
    await applyDeletions(cfg, diff.toDelete);
  }

  console.log(`\nSync finished successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
  await client.end();
}

runSync().catch(async (err) => {
  console.error('Sync failed:', err);
  await client.end();
  process.exit(1);
});
