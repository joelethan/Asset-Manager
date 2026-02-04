import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("school_admin"), // 'platform_admin', 'school_admin', 'teacher', 'student'
  schoolId: integer("school_id").references(() => schools.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
});

export const termTemplates = pgTable("term_templates", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  structure: json("structure").notNull(), // Array of { ordinal: number, name: string }
  isLocked: boolean("is_locked").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("planned"), // 'planned', 'active', 'archived'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  termTemplateId: integer("term_template_id").notNull().references(() => termTemplates.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Classroom definitions and offerings
export const classroomDefinitions = pgTable("classroom_definitions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  level: text("level").notNull(),
});

export const classroomOfferings = pgTable("classroom_offerings", {
  id: serial("id").primaryKey(),
  academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id),
  classroomDefinitionId: integer("classroom_definition_id").notNull().references(() => classroomDefinitions.id),
  displayName: text("display_name").notNull(),
});

export const terms = pgTable("terms", {
  id: serial("id").primaryKey(),
  academicYearId: integer("academic_year_id").notNull().references(() => academicYears.id),
  ordinal: integer("ordinal").notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSchoolSchema = createInsertSchema(schools).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertTermTemplateSchema = createInsertSchema(termTemplates).omit({ id: true, createdAt: true });
export const insertAcademicYearSchema = createInsertSchema(academicYears).omit({ id: true, createdAt: true });
export const insertTermSchema = createInsertSchema(terms).omit({ id: true, createdAt: true });
export const insertClassroomDefinitionSchema = createInsertSchema(classroomDefinitions).omit({ id: true });
export const insertClassroomOfferingSchema = createInsertSchema(classroomOfferings).omit({ id: true });

export type School = typeof schools.$inferSelect;
export type InsertSchool = z.infer<typeof insertSchoolSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type TermTemplate = typeof termTemplates.$inferSelect;
export type InsertTermTemplate = z.infer<typeof insertTermTemplateSchema>;
export type AcademicYear = typeof academicYears.$inferSelect;
export type InsertAcademicYear = z.infer<typeof insertAcademicYearSchema>;
export type Term = typeof terms.$inferSelect;
export type InsertTerm = z.infer<typeof insertTermSchema>;
export type ClassroomDefinition = typeof classroomDefinitions.$inferSelect;
export type InsertClassroomDefinition = z.infer<typeof insertClassroomDefinitionSchema>;
export type ClassroomOffering = typeof classroomOfferings.$inferSelect;
export type InsertClassroomOffering = z.infer<typeof insertClassroomOfferingSchema>;
// Registration-specific schema based on user request
export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
});

export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

// Login-specific schema
export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginUserRequest = z.infer<typeof loginUserSchema>;
