export function getDashboardQueryOptions<TData>(
  schoolId: string,
  queryFn?: () => Promise<TData> | TData,
) {
  return {
    queryKey: ["dashboard", schoolId],
    enabled: !!schoolId,
    staleTime: 30_000,
    refetchOnMount: true,
    placeholderData: (previousData: TData | undefined) => previousData,
    queryFn: queryFn ?? (async () => undefined as TData),
  } as const;
}
