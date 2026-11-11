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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;

export const insertSchoolSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export type InsertSchool = z.infer<typeof insertSchoolSchema>;

export const termStructureSchema = z.object({
  ordinal: z.number(),
  name: z.string(),
});

export const termTemplateInputSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  structure: z.array(termStructureSchema),
});
export type TermTemplateInput = z.infer<typeof termTemplateInputSchema>;

export const academicYearInputSchema = z.object({
  schoolId: z.string(),
  name: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  termTemplateId: z.string(),
});
export type AcademicYearInput = z.infer<typeof academicYearInputSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
