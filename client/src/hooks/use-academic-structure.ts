import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { termTemplatesApi, academicYearsApi, termsApi } from "@/lib/api";
import type { TermTemplateInput, AcademicYearInput } from "@/lib/schemas";

// Term Templates
export function useTermTemplates(schoolId?: string) {
  return useQuery({
    queryKey: ["term-templates", schoolId],
    queryFn: async () => {
      const res = await termTemplatesApi.list(schoolId!);
      if (!res.ok) {
        const error = await res.json();
        throw error; // throw the full error object, not just new Error()
      }
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateTermTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TermTemplateInput) => {
      const dataToSend = { name: data.name, structure: data.structure }; // Remove schoolId from body as it's in the URL
      const res = await termTemplatesApi.create(data.schoolId, dataToSend);
      if (!res.ok) {
        const error = await res.json();
        throw error; // throw the full error object, not just new Error()
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
      if (!res.ok) {
        const error = await res.json();
        throw error; // throw the full error object, not just new Error()
      }
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AcademicYearInput) => {
      const dataToSend = {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        termTemplateId: data.termTemplateId,
      }; // Remove schoolId from body as it's in the URL
      const res = await academicYearsApi.create(data.schoolId, dataToSend);
      if (!res.ok) {
        const error = await res.json();
        throw error; // throw the full error object, not just new Error()
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
        throw error; // throw the full error object, not just new Error()
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["academic-years"] });
    },
  });
}

// Terms
export function useTerms(yearId?: number) {
  return useQuery({
    queryKey: ["terms", yearId],
    queryFn: async () => {
      const res = await termsApi.list(yearId!);
      if (!res.ok) {
        const error = await res.json();
        throw error; // throw the full error object, not just new Error()
      }
      return res.json();
    },
    enabled: !!yearId,
  });
}
