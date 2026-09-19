"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { withHeldMethod, type PaymentMethodChoice } from "@/lib/paymentMethodChoices";
import { useFreshDataFromElsewhere } from "@/hooks/useFreshData";

export function usePaymentMethods(held?: string | null) {
  const [methods, setMethods] = useState<PaymentMethodChoice[]>([]);

  const refresh = useCallback(() => {
    return api
      .get<{ methods: PaymentMethodChoice[] }>("/api/admin/payment-methods/offered")
      .then((data) => setMethods(data.methods ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFreshDataFromElsewhere(refresh);

  return { methods: withHeldMethod(methods, held), refresh };
}
