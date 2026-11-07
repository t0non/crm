"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { destinosDaInterface } from "@/lib/navigation/interface";

import { useAgentInbox } from "@/hooks/ai/useAgentInbox";
import { useSonsDaCentral } from "@/hooks/notifications/useSonsDaCentral";
import { useT } from "@/hooks/i18n/useT";
import { Bell } from "@/lib/ui/icons";

/**
 * Sino da central de avisos (Operação Visível F1): contador de avisos abertos
 * do runtime do agente no header; clique leva a /app/ai/inbox.
 */
export function AlertsBell({ linha = false }: { linha?: boolean } = {}) {
  const { user, activeOrg } = useAuth();
  if (
    !destinosDaInterface(
      activeOrg?.interface_settings,
      user.is_platform_admin && !user.support,
      activeOrg?.role ?? null,
    ).some((d) => d.href === "/app/ai/inbox")
  )
    return null;
  return <VisibleAlertsBell linha={linha} />;
}
function VisibleAlertsBell({ linha }: { linha: boolean }) {
  const t = useT();
  const { data } = useAgentInbox("open");
  // O som da organização para a etapa que avisa e o pedido de pessoa.
  useSonsDaCentral(data?.items);
  const count = data?.open_count ?? 0;

  if (linha) {
    return (
      <Link
        href="/app/ai/inbox"
        data-testid="alerts-bell"
        data-linha-do-rodape=""
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell size={18} aria-hidden />
        <span className="flex-1">{t("Central de notificações")}</span>
        {count > 0 ? (
          <span data-testid="alerts-bell-count" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href="/app/ai/inbox"
      aria-label={
        count > 0
          ? `${t("Central de avisos")} — ${count} ${t("em aberto")}`
          : t("Central de avisos")
      }
      data-testid="alerts-bell"
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:h-9 lg:w-9"
    >
      <Bell size={18} aria-hidden />
      {count > 0 ? (
        <span
          data-testid="alerts-bell-count"
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-destructive-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
