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

export interface PayableMethods {
  methods: PayableMethod[];
  loading: boolean;
  failed: boolean;
}

interface OfferedMethod extends PayableMethod {
  memberFacing: boolean;
}

function payableOf(offered: OfferedMethod[]): PayableMethod[] {
  return offered
    .filter((method) => method.memberFacing && method.accounts.length > 0)
    .map(({ name, accounts }) => ({ name, accounts }));
}

export function usePayableMethods(): PayableMethods {
  const [state, setState] = useState<PayableMethods>({
    methods: [],
    loading: true,
    failed: false,
  });

  useEffect(() => {
    let alive = true;
    api
      .get<{ methods: OfferedMethod[] }>("/api/payment-methods")
      .then((data) => {
        if (alive)
          setState({ methods: payableOf(data.methods ?? []), loading: false, failed: false });
      })
      .catch(() => {
        if (alive) setState({ methods: [], loading: false, failed: true });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
