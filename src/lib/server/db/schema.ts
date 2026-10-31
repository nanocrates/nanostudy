import { foreignKey, integer, jsonb, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

export type ConstrainedVariable = {
  name: string;
  min: number;
  max: number;
  step: number;
  exclude: number[];
};

export type DerivedVariable = {
  name: string;
  expression: string;
};

export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  level: text("level"),
  exam_board: text("exam_board"),
  grade_scale: text("grade_scale"),
}).enableRLS();

export const course_topics = pgTable("course_topics", {
  topic_id: text("topic_id").notNull(),
  course_id: text("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  index: integer("index").notNull(),
}, (table) => [
  primaryKey({ columns: [table.topic_id, table.course_id] }),
]).enableRLS();

export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  read_content: text("read_content"),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
}).enableRLS();

export const topic_lessons = pgTable("topic_lessons", {
  lesson_id: text("lesson_id").notNull().references(() => lessons.id),
  course_id: text("course_id").notNull(),
  topic_id: text("topic_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.course_id, table.topic_id, table.lesson_id] }),
  foreignKey({
    columns: [table.topic_id, table.course_id],
    foreignColumns: [course_topics.topic_id, course_topics.course_id],
  }),
]).enableRLS();

export const basic_questions = pgTable("basic_questions", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
  answers: jsonb("answers").$type<string[]>().notNull().default([]),
  hint: text("hint"),
  explanation: text("explanation"),
}).enableRLS();

export const maths_questions = pgTable("maths_questions", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
  constrained: jsonb("constrained").$type<ConstrainedVariable[]>().notNull().default([]),
  derived: jsonb("derived").$type<DerivedVariable[]>().notNull().default([]),
  constraints: jsonb("constraints").$type<string[]>().notNull().default([]),
  answers: jsonb("answers").$type<string[]>().notNull().default([]),
  hint: text("hint"),
  explanation: text("explanation"),
  marking_type: text("marking_type"),
}).enableRLS();

export const multistep_questions = pgTable("multistep_questions", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
}).enableRLS();

export const multistep_question_parts = pgTable("multistep_question_parts", {
  multistep_id: text("multistep_id").notNull().references(() => multistep_questions.id),
  part_question_id: text("part_question_id").notNull(),
  index: integer("index").notNull(),
}, (table) => [
  primaryKey({ columns: [table.multistep_id, table.index] }),
]).enableRLS();

export const multimaths_questions = pgTable("multimaths_questions", {
  id: text("id").primaryKey(),
  prompt: text("prompt").notNull(),
  constrained: jsonb("constrained").$type<ConstrainedVariable[]>().notNull().default([]),
  derived: jsonb("derived").$type<DerivedVariable[]>().notNull().default([]),
  constraints: jsonb("constraints").$type<string[]>().notNull().default([]),
}).enableRLS();

export const multimaths_question_parts = pgTable("multimaths_question_parts", {
  multimaths_id: text("multimaths_id").notNull().references(() => multimaths_questions.id),
  part_question_id: text("part_question_id").notNull(),
  variable_mapping: jsonb("variable_mapping").$type<Record<string, string>>().notNull().default({}),
  index: integer("index").notNull(),
}, (table) => [
  primaryKey({ columns: [table.multimaths_id, table.index] }),
]).enableRLS();

export const lesson_questions = pgTable("lesson_questions", {
  lesson_id: text("lesson_id").notNull().references(() => lessons.id),
  question_id: text("question_id").notNull(),
}, (table) => [
  primaryKey({ columns: [table.lesson_id, table.question_id] }),
]).enableRLS();

