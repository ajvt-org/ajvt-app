"use client";

import { useEffect, useState } from "react";
import { api } from "./api";

export interface PayableAccount {
  id: string;
  code: string;
  label: string | null;
}

export interface PayableMethod {
  name: string;
  accounts: PayableAccount[];
}

interface OfferedMethod extends PayableMethod {
  memberFacing: boolean;
}

export function usePayableMethods(): PayableMethod[] {
  const [methods, setMethods] = useState<PayableMethod[]>([]);

  useEffect(() => {
    api
      .get<{ methods: OfferedMethod[] }>("/api/payment-methods")
      .then((data) =>
        setMethods(
          (data.methods ?? [])
            .filter((method) => method.memberFacing && method.accounts.length > 0)
            .map(({ name, accounts }) => ({ name, accounts })),
        ),
      )
      .catch(() => {});
  }, []);

  return methods;
}
