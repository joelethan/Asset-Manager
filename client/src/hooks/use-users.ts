import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export function useUser(id: number) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await apiClient.get(`/users/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    enabled: !!id,
  });
}
