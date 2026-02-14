import React, { createContext, useContext, useState, useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";

interface Tenant {
  id: string;
  name: string;
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  tenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Derive tenants from profile memberships, clear on logout
  useEffect(() => {
    if (profile?.memberships && profile.memberships.length > 0) {
      const derivedTenants: Tenant[] = profile.memberships.map((m) => ({
        id: m.schoolId,
        name: m.schoolName,
      }));
      setTenants(derivedTenants);
      if (derivedTenants.length > 0 && !selectedTenant) {
        setSelectedTenant(derivedTenants[0]);
      }
    } else {
      // Clear tenant data on logout (when profile is null)
      setTenants([]);
      setSelectedTenant(null);
    }
  }, [profile, selectedTenant]);

  return (
    <TenantContext.Provider value={{ selectedTenant, setSelectedTenant, tenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
