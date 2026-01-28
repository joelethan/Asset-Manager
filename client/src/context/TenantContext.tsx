import React, { createContext, useContext, useState, useEffect } from "react";

interface Tenant {
  id: number;
  name: string;
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  tenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    let mounted = true;
    (async function fetchSchools() {
      try {
        const res = await fetch("/api/schools", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        // Expecting array of { id, name }
        setTenants(data || []);
        if (data && data.length > 0) {
          setSelectedTenant(data[0]);
        }
      } catch (e) {
        // ignore fetch errors for now
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
