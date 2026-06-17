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
    institutionType?: string;
  }>;
  [key: string]: any;
}

interface ProfileContextType {
  profile: Profile | null;
  setProfile: (p: Profile | null) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  initialized: boolean;
  logout: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Auto-fetch profile on mount if token exists
  useEffect(() => {
    let mounted = true;
    (async function fetchProfileIfTokenExists() {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        setIsAuthenticated(false);
        setInitialized(true);
        return;
      }

      try {
        const res = await authApi.profile();
        if (!res.ok) {
          setIsAuthenticated(false);
          setInitialized(true);
          return;
        }
        const data = await res.json();
        if (mounted) {
          setProfile(data);
          setIsAuthenticated(true);
          setInitialized(true);
        }
      } catch {
        setIsAuthenticated(false);
        setInitialized(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const logout = () => {
    setProfile(null);
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("access_token");
    } catch {}
  };

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isAuthenticated, setIsAuthenticated, initialized, logout }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
