"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { PAYABLE_METHODS } from "./paymentCodes";

export function usePayableMethods(): string[] {
  const [methods, setMethods] = useState<string[]>(PAYABLE_METHODS);

  useEffect(() => {
    api
      .get<{ methods: { name: string; memberFacing: boolean }[] }>("/api/payment-methods")
      .then((data) =>
        setMethods(
          PAYABLE_METHODS.filter((name) =>
            (data.methods ?? []).some((method) => method.name === name && method.memberFacing),
          ),
        ),
      )
      .catch(() => {});
  }, []);

  return methods;
}
