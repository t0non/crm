"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { searchable } from "@/lib/navigation/registry";
import { ArrowRight, Question } from "@/lib/ui/icons";

const ACOES = [
  { href: "/app/inbox", title: "Responder no WhatsApp", hint: "Abra uma conversa, escreva e envie." },
  { href: "/app/kanban", title: "Ver o funil", hint: "Acompanhe em que etapa está cada oportunidade." },
  { href: "/app/agenda", title: "Ver meus horários", hint: "Consulte ou marque um compromisso." },
  { href: "/app/contacts", title: "Encontrar um contato", hint: "Busque pelo nome ou telefone." },
  { href: "/app/ai/followups", title: "Acompanhar retornos", hint: "Veja o que está programado e o que foi enviado." },
  { href: "/app/connections", title: "Conectar o WhatsApp", hint: "Confira a conexão e abra o QR Code quando necessário." },
] as const;

export function GuiaRapido() {
  const [aberto, setAberto] = useState(false);
  const { user, activeOrg } = useAuth();
  const t = useT();
  const visiveis = new Set(searchable(
    user.is_platform_admin && !user.support,
    activeOrg?.role ?? null,
    activeOrg?.interface_settings,
    activeOrg?.modulos_ligados ?? [],
    activeOrg?.capacidades_ligadas ?? [],
  ).map(({ href }) => href));
  const acoes = ACOES.filter(({ href }) => visiveis.has(href));
  if (!acoes.length) return null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 max-xl:w-11 max-xl:px-0" aria-label={t("Guia rápido")} title={t("Guia rápido")}>
          <Question weight="regular" aria-hidden />
          <span className="hidden xl:inline">{t("Guia rápido")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] space-y-2 p-3">
        <h2 className="px-2 pt-1 text-sm font-semibold">{t("O que você quer fazer?")}</h2>
        <ul className="space-y-1">
          {acoes.map(({ href, title, hint }) => (
            <li key={href}>
              <Link href={href} onClick={() => setAberto(false)} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent-soft">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t(title)}</span>
                  <span className="block text-xs text-muted-foreground">{t(hint)}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-accent" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
