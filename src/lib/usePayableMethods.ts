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

export function usePayableMethods(): PayableMethods {
  const [state, setState] = useState<PayableMethods>({
    methods: [],
    loading: true,
    failed: false,
  });

  useEffect(() => {
    let alive = true;
    api
      .get<{ methods: PayableMethod[] }>("/api/payment-methods")
      .then((data) => {
        if (alive) setState({ methods: data.methods ?? [], loading: false, failed: false });
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
