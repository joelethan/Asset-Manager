import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { insertSchoolSchema } from "@shared/schema";
import type { z } from "zod";

type InsertSchool = z.infer<typeof insertSchoolSchema>;

export function useSchools() {
  return useQuery({
    queryKey: [api.schools.list.path],
    queryFn: async () => {
      const res = await fetch(api.schools.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schools");
      return api.schools.list.responses[200].parse(await res.json());
    },
  });
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: [api.schools.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.schools.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch school");
      return api.schools.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateSchool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertSchool) => {
      const validated = api.schools.create.input.parse(data);
      const res = await fetch(api.schools.create.path, {
        method: api.schools.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.schools.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create school");
      }
      return api.schools.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.schools.list.path] });
    },
  });
}
