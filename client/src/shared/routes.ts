import { z } from 'zod';
import { insertSchoolSchema, registerUserSchema, loginUserSchema, schools, users, insertTermTemplateSchema, insertAcademicYearSchema, insertTermSchema, insertClassroomDefinitionSchema, classroomDefinitions, classroomOfferings, insertClassroomOfferingSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const termStructureSchema = z.object({
  ordinal: z.number(),
  name: z.string(),
});

export const termTemplateInputSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  structure: z.array(termStructureSchema),
});

export const academicYearInputSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  termTemplateId: z.string(),
});

export const academicYearStatusInputSchema = z.object({
  status: z.enum(['planned', 'active', 'archived']),
});

export const api = {
  schools: {
    list: { method: 'GET' as const, path: '/api/schools', responses: { 200: z.array(z.custom<typeof schools.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/schools', input: insertSchoolSchema, responses: { 201: z.custom<typeof schools.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/schools/:id', responses: { 200: z.custom<typeof schools.$inferSelect>(), 404: errorSchemas.notFound } },
  },
  termTemplates: {
    list: { method: 'GET' as const, path: '/api/term-templates', responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/term-templates', input: termTemplateInputSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
  },
  academicYears: {
    list: { method: 'GET' as const, path: '/api/academic-years', responses: { 200: z.array(z.any()) } },
    create: { method: 'POST' as const, path: '/api/academic-years', input: academicYearInputSchema, responses: { 201: z.any(), 400: errorSchemas.validation } },
    updateStatus: { method: 'PATCH' as const, path: '/api/academic-years/:id/status', responses: { 200: z.any(), 404: errorSchemas.notFound } },
  },
  terms: {
    list: { method: 'GET' as const, path: '/api/academic-years/:yearId/terms', responses: { 200: z.array(z.any()) } },
  },
  classroomDefinitions: {
    list: { method: 'GET' as const, path: '/api/schools/:schoolId/classroom-definitions', responses: { 200: z.array(z.custom<typeof classroomDefinitions.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/schools/:schoolId/classroom-definitions', input: insertClassroomDefinitionSchema, responses: { 201: z.custom<typeof classroomDefinitions.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/schools/:schoolId/classroom-definitions/:id', responses: { 200: z.custom<typeof classroomDefinitions.$inferSelect>(), 404: errorSchemas.notFound } },
    update: { method: 'PATCH' as const, path: '/api/schools/:schoolId/classroom-definitions/:id', input: insertClassroomDefinitionSchema, responses: { 200: z.custom<typeof classroomDefinitions.$inferSelect>(), 404: errorSchemas.notFound, 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/schools/:schoolId/classroom-definitions/:id', responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },
  classroomOfferings: {
    list: { method: 'GET' as const, path: '/api/years/:yearId/classroom-offerings', responses: { 200: z.array(z.custom<typeof classroomOfferings.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/years/:yearId/classroom-offerings', input: insertClassroomOfferingSchema, responses: { 201: z.custom<typeof classroomOfferings.$inferSelect>(), 400: errorSchemas.validation } },
    get: { method: 'GET' as const, path: '/api/years/:yearId/classroom-offerings/:id', responses: { 200: z.custom<typeof classroomOfferings.$inferSelect>(), 404: errorSchemas.notFound } },
    update: { method: 'PATCH' as const, path: '/api/years/:yearId/classroom-offerings/:id', input: insertClassroomOfferingSchema, responses: { 200: z.custom<typeof classroomOfferings.$inferSelect>(), 404: errorSchemas.notFound, 400: errorSchemas.validation } },
    delete: { method: 'DELETE' as const, path: '/api/years/:yearId/classroom-offerings/:id', responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound } },
  },
  users: {
    get: { method: 'GET' as const, path: '/api/users/:id', responses: { 200: z.custom<typeof users.$inferSelect>(), 404: errorSchemas.notFound } },
    register: { method: 'POST' as const, path: '/api/register', input: registerUserSchema, responses: { 201: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation } },
    login: { method: 'POST' as const, path: '/api/login', input: loginUserSchema, responses: { 200: z.custom<typeof users.$inferSelect>(), 400: errorSchemas.validation, 401: z.object({ message: z.string() }) } },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
