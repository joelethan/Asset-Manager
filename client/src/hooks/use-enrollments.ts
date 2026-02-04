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
    mutationFn: async ({ offeringId, schoolId, payload }: { offeringId: string; schoolId: string; payload: unknown }) => {
      const res = await enrollmentsApi.create(offeringId, schoolId, payload);
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

export function useBulkEnroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ offeringId, schoolId, payload }: { offeringId: string; schoolId: string; payload: unknown }) => {
      const res = await enrollmentsApi.bulkCreate(offeringId, schoolId, payload);
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
