import { z } from 'zod';
import { insertSchoolSchema, insertUserSchema, registerUserSchema, loginUserSchema, schools, users, insertTermTemplateSchema, insertAcademicYearSchema, insertTermSchema } from './schema';

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

// Term structure for template
export const termStructureSchema = z.object({
  ordinal: z.number(),
  name: z.string(),
});

export const termTemplateInputSchema = z.object({
  schoolId: z.number(),
  name: z.string(),
  structure: z.array(termStructureSchema),
});

export const academicYearInputSchema = z.object({
  schoolId: z.number(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  termTemplateId: z.number(),
});

export const academicYearStatusInputSchema = z.object({
  status: z.enum(['planned', 'active', 'archived']),
});

export const api = {
  schools: {
    list: {
      method: 'GET' as const,
      path: '/api/schools',
      responses: {
        200: z.array(z.custom<typeof schools.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/schools',
      input: insertSchoolSchema,
      responses: {
        201: z.custom<typeof schools.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/schools/:id',
      responses: {
        200: z.custom<typeof schools.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  termTemplates: {
    list: {
      method: 'GET' as const,
      path: '/api/term-templates',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/term-templates',
      input: termTemplateInputSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
  },
  academicYears: {
    list: {
      method: 'GET' as const,
      path: '/api/academic-years',
      responses: {
        200: z.array(z.any()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/academic-years',
      input: academicYearInputSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/academic-years/:id/status',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  terms: {
    list: {
      method: 'GET' as const,
      path: '/api/academic-years/:yearId/terms',
      responses: {
        200: z.array(z.any()),
      },
    },
  },
  users: {
    get: {
      method: 'GET' as const,
      path: '/api/users/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/register',
      input: registerUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: loginUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        401: z.object({ message: z.string() }),
      },
    },
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
