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
