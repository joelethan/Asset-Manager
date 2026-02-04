import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentsApi } from "@/lib/api";

export function useStudents(schoolId?: string) {
  return useQuery({
    queryKey: ["students", schoolId],
    queryFn: async () => {
      const res = await studentsApi.list(schoolId!);
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolId, data }: { schoolId: string; data: unknown }) => {
      const res = await studentsApi.create(schoolId, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.message || "Failed to create student");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students", variables.schoolId] });
    },
  });
}
