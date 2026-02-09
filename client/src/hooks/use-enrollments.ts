import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { enrollmentsApi } from "@/lib/api";

// List enrollments grouped by classroom for a given year and school
export function useEnrollments(yearId?: string, schoolId?: string) {
  return useQuery({
    queryKey: ["enrollments", yearId, schoolId],
    queryFn: async () => {
      const res = await enrollmentsApi.list(yearId!, schoolId!);
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      return res.json();
    },
    enabled: !!yearId && !!schoolId,
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ definitionId, schoolId, payload }: { definitionId: string; schoolId: string; payload: unknown }) => {
      const res = await enrollmentsApi.create(definitionId, schoolId, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || "Failed to enroll student");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate both enrollments for the academic year and the list of students (so UI refreshes)
      queryClient.invalidateQueries({ queryKey: ["students", variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

//  - Let's check if it's necessary to use 'useBulkEnroll'. If not, let's remove it.
export function useBulkEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ definitionId, schoolId, payload }: { definitionId: string; schoolId: string; payload: unknown }) => {
      const res = await enrollmentsApi.bulkCreate(definitionId, schoolId, payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || "Failed to create bulk enrollments");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", variables.schoolId] });
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}

export function useDeleteEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ enrollmentId }: { enrollmentId: string }) => {
      const res = await enrollmentsApi.delete(enrollmentId);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || "Failed to delete enrollment");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    },
  });
}
