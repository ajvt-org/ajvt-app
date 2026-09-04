"use client";

import { createContext, Suspense, useContext } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const AdminOrigin = createContext("");

export function useAdminOrigin(): string {
  return useContext(AdminOrigin);
}

function CurrentPath({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (
    <AdminOrigin.Provider value={search ? `${pathname}?${search}` : pathname}>
      {children}
    </AdminOrigin.Provider>
  );
}

export function AdminOriginProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <CurrentPath>{children}</CurrentPath>
    </Suspense>
  );
}
