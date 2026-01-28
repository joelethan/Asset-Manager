import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { termTemplateInputSchema, academicYearInputSchema, academicYearStatusInputSchema } from "@shared/routes";
import type { z } from "zod";

type TermTemplateInput = z.infer<typeof import("@shared/routes").termTemplateInputSchema>;
type AcademicYearInput = z.infer<typeof import("@shared/routes").academicYearInputSchema>;
type AcademicYearStatusInput = z.infer<typeof import("@shared/routes").academicYearStatusInputSchema>;

// Term Templates
export function useTermTemplates(schoolId?: number) {
  return useQuery({
    queryKey: ["term-templates", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/term-templates?schoolId=${schoolId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch term templates");
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateTermTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TermTemplateInput) => {
      const res = await fetch("/api/term-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create term template");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["term-templates", variables.schoolId],
      });
    },
  });
}

// Academic Years
export function useAcademicYears(schoolId?: number) {
  return useQuery({
    queryKey: ["academic-years", schoolId],
    queryFn: async () => {
      const res = await fetch(`/api/academic-years?schoolId=${schoolId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch academic years");
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AcademicYearInput) => {
      const res = await fetch("/api/academic-years", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create academic year");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["academic-years", variables.schoolId],
      });
    },
  });
}

export function useUpdateAcademicYearStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }) => {
      const res = await fetch(`/api/academic-years/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update academic year status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["academic-years"],
      });
    },
  });
}

// Terms
export function useTerms(yearId?: number) {
  return useQuery({
    queryKey: ["terms", yearId],
    queryFn: async () => {
      const url = `/api/academic-years/${yearId}/terms`;
      const res = await fetch(url, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch terms");
      return res.json();
    },
    enabled: !!yearId,
  });
}
