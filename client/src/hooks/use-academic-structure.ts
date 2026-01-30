import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { termTemplatesApi, academicYearsApi, termsApi } from "@/lib/api";
import type { termTemplateInputSchema, academicYearInputSchema, academicYearStatusInputSchema } from "@shared/routes";
import type { z } from "zod";

type TermTemplateInput = z.infer<typeof import("@shared/routes").termTemplateInputSchema>;
type AcademicYearInput = z.infer<typeof import("@shared/routes").academicYearInputSchema>;
type AcademicYearStatusInput = z.infer<typeof import("@shared/routes").academicYearStatusInputSchema>;

// Term Templates
export function useTermTemplates(schoolId?: string) {
  return useQuery({
    queryKey: ["term-templates", schoolId],
    queryFn: async () => {
      const res = await termTemplatesApi.list(schoolId!);
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
      const res = await termTemplatesApi.create(data.schoolId, data);
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
export function useAcademicYears(schoolId?: string) {
  return useQuery({
    queryKey: ["academic-years", schoolId],
    queryFn: async () => {
      const res = await academicYearsApi.list(schoolId!);
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
      const res = await academicYearsApi.create(data);
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
      const res = await academicYearsApi.updateStatus(id, status);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update academic year status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
  });
}
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
      const res = await termsApi.list(yearId!);
      if (!res.ok) throw new Error("Failed to fetch terms");
      return res.json();
    },
    enabled: !!yearId,
  });
}
