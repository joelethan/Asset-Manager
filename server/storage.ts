import { users, schools, termTemplates, academicYears, terms, type User, type InsertUser, type School, type InsertSchool, type TermTemplate, type InsertTermTemplate, type AcademicYear, type InsertAcademicYear, type Term, type InsertTerm } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getSchools(): Promise<School[]>;
  getSchool(id: number): Promise<School | undefined>;
  createSchool(school: InsertSchool): Promise<School>;

  getTermTemplates(schoolId: number): Promise<TermTemplate[]>;
  getTermTemplate(id: number): Promise<TermTemplate | undefined>;
  createTermTemplate(template: InsertTermTemplate): Promise<TermTemplate>;

  getAcademicYears(schoolId: number): Promise<AcademicYear[]>;
  getAcademicYear(id: number): Promise<AcademicYear | undefined>;
  createAcademicYear(year: InsertAcademicYear): Promise<AcademicYear>;
  updateAcademicYearStatus(id: number, status: string): Promise<AcademicYear | undefined>;

  getTerms(academicYearId: number): Promise<Term[]>;
  getTerm(id: number): Promise<Term | undefined>;
  createTerm(term: InsertTerm): Promise<Term>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getSchools(): Promise<School[]> {
    return await db.select().from(schools);
  }

  async getSchool(id: number): Promise<School | undefined> {
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    return school;
  }

  async createSchool(insertSchool: InsertSchool): Promise<School> {
    const [school] = await db.insert(schools).values(insertSchool).returning();
    return school;
  }

  async getTermTemplates(schoolId: number): Promise<TermTemplate[]> {
    return await db.select().from(termTemplates).where(eq(termTemplates.schoolId, schoolId));
  }

  async getTermTemplate(id: number): Promise<TermTemplate | undefined> {
    const [template] = await db.select().from(termTemplates).where(eq(termTemplates.id, id));
    return template;
  }

  async createTermTemplate(insertTemplate: InsertTermTemplate): Promise<TermTemplate> {
    const [template] = await db.insert(termTemplates).values(insertTemplate).returning();
    return template;
  }

  async getAcademicYears(schoolId: number): Promise<AcademicYear[]> {
    return await db.select().from(academicYears).where(eq(academicYears.schoolId, schoolId));
  }

  async getAcademicYear(id: number): Promise<AcademicYear | undefined> {
    const [year] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    return year;
  }

  async createAcademicYear(insertYear: InsertAcademicYear): Promise<AcademicYear> {
    const [year] = await db.insert(academicYears).values(insertYear).returning();
    return year;
  }

  async updateAcademicYearStatus(id: number, status: string): Promise<AcademicYear | undefined> {
    const [year] = await db.update(academicYears).set({ status }).where(eq(academicYears.id, id)).returning();
    return year;
  }

  async getTerms(academicYearId: number): Promise<Term[]> {
    return await db.select().from(terms).where(eq(terms.academicYearId, academicYearId));
  }

  async getTerm(id: number): Promise<Term | undefined> {
    const [term] = await db.select().from(terms).where(eq(terms.id, id));
    return term;
  }

  async createTerm(insertTerm: InsertTerm): Promise<Term> {
    const [term] = await db.insert(terms).values(insertTerm).returning();
    return term;
  }
}

export const storage = new DatabaseStorage();
