"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { withHeldMethod, type PaymentMethodChoice } from "@/lib/paymentMethodChoices";

export function usePaymentMethods(held?: string | null) {
  const [methods, setMethods] = useState<PaymentMethodChoice[]>([]);

  const refresh = useCallback(() => {
    return api
      .get<{ methods: PaymentMethodChoice[] }>("/api/payment-methods")
      .then((data) => setMethods(data.methods ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { methods: withHeldMethod(methods, held), refresh };
}
