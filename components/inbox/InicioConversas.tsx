"use client";
import Link from "next/link";
import { MessageCircle, Plus } from "lucide-react";
import { useT } from "@/hooks/i18n/useT";
import s from "./InicioConversas.module.css";

/**
 * A coluna da conversa quando nenhuma está aberta: uma frase dizendo o que
 * fazer agora e, para quem pode, o único atalho que importa nesse momento.
 */
export function InicioConversas({ podeConectar }: { podeConectar: boolean }) {
  const t = useT();
  return (
    <div className={s.empty}>
      <div className={s.center}>
        <MessageCircle size={40} strokeWidth={1.25} aria-hidden="true" />
        <h2>{t("Escolha uma conversa da lista para responder.")}</h2>
        <p>{t("Todas as mensagens do seu WhatsApp chegam aqui, num lugar só.")}</p>
        {podeConectar && (
          <div className={s.actions}>
            <Link href="/app/connections">
              <Plus size={16} aria-hidden="true" />
              {t("Conectar um número de WhatsApp")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
