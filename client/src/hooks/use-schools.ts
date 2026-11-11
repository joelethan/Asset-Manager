import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schoolsApi } from "@/lib/api";
import { insertSchoolSchema, type InsertSchool } from "@/lib/schemas";

export function useSchools() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await schoolsApi.list();
      if (!res.ok) throw new Error("Failed to fetch schools");
      return res.json();
    },
  });
}

export function useSchool(id: string) {
  return useQuery({
    queryKey: ["schools", id],
    queryFn: async () => {
      const res = await schoolsApi.get(id);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch school");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSchool) => {
      const validated = insertSchoolSchema.parse(data);
      const res = await schoolsApi.create(validated);
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json().catch(() => ({ message: "Bad Request" }));
          throw new Error(error.message || "Failed to create school");
        }
        throw new Error("Failed to create school");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools"] });
    },
  });
}
