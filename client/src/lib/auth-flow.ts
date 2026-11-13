export interface AuthProfileLike {
  memberships?: Array<unknown> | null;
}

export function getPostAuthRedirect(profile?: AuthProfileLike | null): string {
  const hasMemberships = !!profile?.memberships?.length;
  return hasMemberships ? "/dashboard" : "/schools-create";
}
