import React, { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "@/lib/api";

interface Profile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  memberships?: Array<{
    schoolId: string;
    schoolName: string;
    role: string;
  }>;
  [key: string]: any;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  // Auto-fetch profile on mount if token exists
  useEffect(() => {
    let mounted = true;
    (async function fetchProfileIfTokenExists() {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) return;

      try {
        const res = await authApi.profile();
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setProfile(data);
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
