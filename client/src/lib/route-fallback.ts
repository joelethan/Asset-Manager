export interface FallbackRouteOptions {
  isAuthenticated: boolean;
  hasMemberships: boolean;
}

export function getFallbackRoute({ isAuthenticated, hasMemberships }: FallbackRouteOptions): string {
  if (!isAuthenticated) return "/login";
  if (!hasMemberships) return "/schools-create";
  return "/dashboard";
}
