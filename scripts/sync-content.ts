import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { and, eq, getTableColumns, inArray, or } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import JSON5 from 'json5';

import * as schema from '../src/lib/server/db/schema';

config({ path: '.env' });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({ client, schema });

const BATCH_SIZE = 500;

const TABLE_ORDER = [
  'courses',
  'course_topics',
  'lessons',
  'topic_lessons',
  'basic_questions',
  'maths_questions',
  'multistep_questions',
  'multimaths_questions',
  'multistep_question_parts',
  'multimaths_question_parts',
  'lesson_questions',
] as const;

function getPrimaryKeys(table: any): string[] {
  const tableConfig = getTableConfig(table);
  const pks = tableConfig.columns.filter((c: any) => c.primary).map((c: any) => c.name);
  tableConfig.primaryKeys.forEach((pk: any) => {
    pks.push(...pk.columns.map((c: any) => c.name));
  });
  return [...new Set(pks)];
}

function extractRow(table: any, raw: Record<string, any>): Record<string, any> {
  const cols = getTableColumns(table);
  const row: Record<string, any> = {};
  for (const [key, col] of Object.entries(cols) as [string, any][]) {
    if (raw[key] !== undefined && raw[key] !== null) {
      row[key] = raw[key];
    } else if (raw[key] === null) {
      row[key] = null;
    } else if (col.default !== undefined) {
      row[key] = typeof col.default === 'function' ? col.default() : structuredClone(col.default);
    } else {
      row[key] = null;
    }
  }
  return row;
}

function canonicalHash(obj: unknown): string {
  const stringifyDeterministic = (val: any): string => {
    if (val === null || typeof val !== 'object') return JSON.stringify(val);
    if (Array.isArray(val)) return `[${val.map(stringifyDeterministic).join(',')}]`;
    const sortedKeys = Object.keys(val).sort();
    return `{${sortedKeys.map((k) => `${JSON.stringify(k)}:${stringifyDeterministic(val[k])}`).join(',')}}`;
  };
  return createHash('sha256').update(stringifyDeterministic(obj)).digest('hex');
}

const stores = new Map<string, Map<string, any>>();

function save(tableName: keyof typeof schema, raw: Record<string, any>) {
  const table = schema[tableName] as any;
  const row = extractRow(table, raw);
  const pks = getPrimaryKeys(table);
  const key = pks.map((pk) => String(row[pk])).join(':::');

  if (!stores.has(tableName)) stores.set(tableName, new Map());
  stores.get(tableName)!.set(key, row);
}

function processQuestion(q: any): string {
  if (typeof q === 'string') return q;
  if (!q?.type) throw new Error(`Invalid question definition: ${q.id}: ${JSON.stringify(q)}`);

  const type = q.type as 'basic' | 'maths' | 'multistep' | 'multimaths';
  save(`${type}_questions` as any, q);

  q.parts?.forEach((part: any) => {
    if (type === 'multimaths' && !part.question) {
      throw new Error(`Multimaths part for question ${q.id} is missing a question definition for part index ${part.index}`);
    }
    const partQuestionId = processQuestion(part.question);
    save(`${type}_question_parts` as any, {
      [`${type}_id`]: q.id,
      part_question_id: partQuestionId,
      variable_mapping: part.variable_mapping,
      index: part.index,
    });
  });

  return q.id;
}

function processLesson(lesson: any, courseId?: string, topicId?: string): string {
  if (typeof lesson === 'string') {
    if (courseId && topicId) save('topic_lessons', { course_id: courseId, topic_id: topicId, lesson_id: lesson });
    return lesson;
  }

  save('lessons', lesson);
  if (courseId && topicId) save('topic_lessons', { course_id: courseId, topic_id: topicId, lesson_id: lesson.id });

  lesson.questions?.forEach((q: any) => {
    const qId = processQuestion(q);
    save('lesson_questions', { lesson_id: lesson.id, question_id: qId });
  });

  return lesson.id;
}

function processTopic(topic: any, courseId: string) {
  save('course_topics', { topic_id: topic.topic_id, course_id: courseId, title: topic.title, index: topic.index });
  topic.lessons?.forEach((l: any) => processLesson(l, courseId, topic.topic_id));
}

function processCourse(course: any) {
  save('courses', course);
  course.topics?.forEach((t: any) => processTopic(t, course.id));
}

function normalizePayload(payload: any) {
  payload.questions?.forEach(processQuestion);
  payload.lessons?.forEach((l: any) => processLesson(l));
  payload.courses?.forEach(processCourse);
}

async function computeDiff(table: any, primaryKeys: string[], incomingItems: any[]) {
  const dbRows = await db.select().from(table);
  const getKey = (item: any) => primaryKeys.map((pk) => String(item[pk])).join(':::');

  const dbMap = new Map(dbRows.map((r: any) => [getKey(r), r]));
  const incomingMap = new Map(incomingItems.map((i: any) => [getKey(i), i]));

  const toInsert: any[] = [];
  const toUpdate: any[] = [];
  let skipped = 0;

  for (const [key, incomingItem] of incomingMap.entries()) {
    const existing = dbMap.get(key);
    if (!existing) {
      toInsert.push(incomingItem);
    } else if (canonicalHash(existing) !== canonicalHash({ ...existing, ...incomingItem })) {
      toUpdate.push(incomingItem);
    } else {
      skipped++;
    }
  }

  const toDelete = dbRows.filter((r: any) => !incomingMap.has(getKey(r)));
  return { toInsert, toUpdate, toDelete, skipped };
}

async function applyUpserts(
  tableName: string,
  table: any,
  primaryKeys: string[],
  toInsert: any[],
  toUpdate: any[]
) {
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    await db.insert(table).values(toInsert.slice(i, i + BATCH_SIZE));
  }

  for (const item of toUpdate) {
    const where = and(...primaryKeys.map((pk) => eq(table[pk], item[pk])));
    await db.update(table).set(item).where(where);
  }

  if (toInsert.length > 0 || toUpdate.length > 0) {
    console.log(`[${tableName}] Upserts -> Inserted: ${toInsert.length} | Updated: ${toUpdate.length}`);
  }
}

async function applyDeletions(
  tableName: string,
  table: any,
  primaryKeys: string[],
  toDelete: any[]
) {
  if (toDelete.length === 0) return;

  if (primaryKeys.length === 1) {
    const pk = primaryKeys[0];
    const deleteIds = toDelete.map((item) => item[pk]);
    for (let i = 0; i < deleteIds.length; i += BATCH_SIZE) {
      await db.delete(table).where(inArray(table[pk], deleteIds.slice(i, i + BATCH_SIZE)));
    }
  } else {
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const chunk = toDelete.slice(i, i + BATCH_SIZE);
      const conditions = chunk.map((item) =>
        and(...primaryKeys.map((pk) => eq(table[pk], item[pk])))
      );
      await db.delete(table).where(or(...conditions));
    }
  }

  console.log(`[${tableName}] Prune -> Deleted: ${toDelete.length} removed items`);
}

async function runSync() {
  const startTime = Date.now();
  const filePath = resolve(process.cwd(), process.argv[2] || 'content.json5');
  console.log(`Loading content from ${filePath}...`);

  const fileData = readFileSync(filePath, 'utf-8');
  const payload = JSON5.parse(fileData);

  normalizePayload(payload);

  console.log('Calculating diffs against database...\n');

  const diffs = new Map<string, { toInsert: any[]; toUpdate: any[]; toDelete: any[]; skipped: number }>();

  for (const tableName of TABLE_ORDER) {
    const table = schema[tableName];
    const primaryKeys = getPrimaryKeys(table);
    const incomingItems = Array.from(stores.get(tableName)?.values() || []);

    const diff = await computeDiff(table, primaryKeys, incomingItems);
    diffs.set(tableName, diff);
    console.log(`[${tableName}] Skipped (Unchanged): ${diff.skipped}`);
  }

  console.log('\nApplying insertions and updates (Top-Down)...');
  for (const tableName of TABLE_ORDER) {
    const table = schema[tableName];
    const primaryKeys = getPrimaryKeys(table);
    const { toInsert, toUpdate } = diffs.get(tableName)!;
    await applyUpserts(tableName, table, primaryKeys, toInsert, toUpdate);
  }

  console.log('\nPruning removed entities (Bottom-Up)...');
  for (const tableName of [...TABLE_ORDER].reverse()) {
    const table = schema[tableName];
    const primaryKeys = getPrimaryKeys(table);
    const { toDelete } = diffs.get(tableName)!;
    await applyDeletions(tableName, table, primaryKeys, toDelete);
  }

  console.log(`\nSync finished successfully in ${((Date.now() - startTime) / 1000).toFixed(2)}s.`);
  await client.end();
}

runSync().catch(async (err) => {
  console.error('Sync failed:', err);
  await client.end();
  process.exit(1);
});
