import React, { createContext, useContext, useState } from "react";
import { tenants } from "@/mock-data";

interface Tenant {
  name: string;
  id: string;
}

interface TenantContextType {
  selectedTenant: Tenant | null;
  setSelectedTenant: (tenant: Tenant | null) => void;
  tenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(
    tenants[0] || null
  );

  return (
    <TenantContext.Provider
      value={{ selectedTenant, setSelectedTenant, tenants }}
    >
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
