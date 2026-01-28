import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Schools API
  app.get(api.schools.list.path, async (_req, res) => {
    const schools = await storage.getSchools();
    res.json(schools);
  });

  app.post(api.schools.create.path, async (req, res) => {
    try {
      const input = api.schools.create.input.parse(req.body);
      const school = await storage.createSchool(input);
      res.status(201).json(school);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.schools.get.path, async (req, res) => {
    const school = await storage.getSchool(Number(req.params.id));
    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }
    res.json(school);
  });

  // Term Templates API
  app.get(api.termTemplates.list.path, async (req, res) => {
    try {
      const schoolId = Number(req.query.schoolId);
      const templates = await storage.getTermTemplates(schoolId);
      res.json(templates);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post(api.termTemplates.create.path, async (req, res) => {
    try {
      const input = api.termTemplates.create.input.parse(req.body);
      const template = await storage.createTermTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Academic Years API
  app.get(api.academicYears.list.path, async (req, res) => {
    try {
      const schoolId = Number(req.query.schoolId);
      const years = await storage.getAcademicYears(schoolId);
      res.json(years);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  app.post(api.academicYears.create.path, async (req, res) => {
    try {
      const input = api.academicYears.create.input.parse(req.body);
      // Create academic year
      const year = await storage.createAcademicYear(input);
      
      // Auto-create terms based on term template
      const template = await storage.getTermTemplate(input.termTemplateId);
      if (template && Array.isArray(template.structure)) {
        const structure = template.structure as Array<{ ordinal: number; name: string }>;
        for (const termDef of structure) {
          await storage.createTerm({
            academicYearId: year.id,
            ordinal: termDef.ordinal,
            name: termDef.name,
            startDate: input.startDate,
            endDate: input.endDate,
          });
        }
      }
      
      res.status(201).json(year);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.academicYears.updateStatus.path, async (req, res) => {
    try {
      const yearId = Number(req.params.id);
      const { status } = req.body;
      const year = await storage.updateAcademicYearStatus(yearId, status);
      if (!year) {
        return res.status(404).json({ message: 'Academic year not found' });
      }
      res.json(year);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  // Terms API
  app.get(api.terms.list.path, async (req, res) => {
    try {
      const yearId = Number(req.params.yearId);
      const yearTerms = await storage.getTerms(yearId);
      res.json(yearTerms);
    } catch (err) {
      res.status(400).json({ message: 'Invalid request' });
    }
  });

  // Users API
  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });

  app.post(api.users.register.path, async (req, res) => {
    try {
      const input = api.users.register.input.parse(req.body);
      // Map registration data to user schema
      const user = await storage.createUser({
        username: input.email,
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        role: "school_admin",
      });
      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed data endpoint (optional, for demo)
  app.post('/api/seed', async (_req, res) => {
    const existingSchools = await storage.getSchools();
    if (existingSchools.length === 0) {
      await storage.createSchool({ name: "Springfield Elementary", slug: "springfield" });
      await storage.createSchool({ name: "Hogwarts", slug: "hogwarts" });
      res.json({ message: "Seeded schools" });
    } else {
      res.json({ message: "Already seeded" });
    }
  });

  return httpServer;
}
