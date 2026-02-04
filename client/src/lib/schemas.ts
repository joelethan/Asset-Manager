import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(10),
});

export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

export const loginUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginUserRequest = z.infer<typeof loginUserSchema>;

export const insertSchoolSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;
