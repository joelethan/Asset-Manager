import { guardiansApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useGuardians(schoolId?: string) {
    return useQuery({
        queryKey: ["guardians", schoolId],
        queryFn: async () => {
            const res = await guardiansApi.getGuardians(schoolId!);
            if (!res.ok) throw new Error("Failed to fetch guardians");
            return res.json();
        },
        enabled: !!schoolId,
    });
}

export function useCreateGuardian() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ data }: { data: unknown }) => {
            const res = await guardiansApi.create(data);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error?.message || "Failed to create guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
        },
    });
}

export function useUpdateGuardian() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ guardianId, data }: { guardianId: string; data: unknown }) => {
            const res = await guardiansApi.update(guardianId, data);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error?.message || "Failed to update guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
        },
    });
}

export function useDeleteGuardian() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ guardianId }: { guardianId: string }) => {
            const res = await guardiansApi.delete(guardianId);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error?.message || "Failed to delete guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
        },
    });
}

export function useSetPrimaryGuardian() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ studentId, guardianId }: { studentId: string; guardianId: string }) => {
            const res = await guardiansApi.setPrimary(studentId, guardianId);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error?.message || "Failed to set primary guardian");
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["guardians"] });
        },
    });
}