"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { skipWhatsapp } from "@/app/actions/onboarding/skipWhatsapp";

export function ManualChannelContinue() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await skipWhatsapp();
        })
      }
    >
      Continuar; concluir a conexão depois em Conexões
    </Button>
  );
}
