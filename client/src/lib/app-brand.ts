export const DEFAULT_APP_NAME = "AtomSchoolManagement";

export function resolveAppName(value?: string | null): string {
  const rawValue = (value ?? import.meta.env.VITE_APP_NAME ?? DEFAULT_APP_NAME).trim();
  return rawValue || DEFAULT_APP_NAME;
}
