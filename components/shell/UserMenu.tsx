"use client";
import { useTransition } from "react";
import { useUser, useAuth, useActiveOrg } from "@/hooks/auth/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SeletorDeIdioma } from "@/components/shell/SeletorDeIdioma";
import { useT } from "@/hooks/i18n/useT";
import Link from "next/link";
import { SignOut, ShieldCheck } from "@/lib/ui/icons";

function initials(name: string | null, email: string): string {
  if (name && name.trim()) {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function UserMenu({ linha = false }: { linha?: boolean } = {}) {
  const t = useT();
  const user = useUser();
  const { signOut } = useAuth();
  const [isPending, startTransition] = useTransition();
  const org = useActiveOrg();

  return (
    <div className={linha ? "w-full" : "flex items-center gap-2"}>
      {!linha && <SeletorDeIdioma />}
      {!linha && <ThemeToggle />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {linha ? (
            <button
              type="button"
              data-linha-do-rodape=""
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted"
              aria-label={`${t("Menu do usuário")}: ${user.full_name ?? user.email}`}
            >
              <Avatar className="size-9">
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{user.full_name ?? user.email}</span>
                <span className="block truncate text-xs text-muted-foreground">{org?.name}</span>
              </span>
            </button>
          ) : (
            <Button variant="ghost" size="icon" className="rounded-full" aria-label={`${t("Menu do usuário")}: ${initials(user.full_name, user.email)}`}>
              <Avatar className="h-8 w-8">
                {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                <AvatarFallback>{initials(user.full_name, user.email)}</AvatarFallback>
              </Avatar>
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={linha ? "start" : "end"} side={linha ? "top" : undefined} className="min-w-[220px]">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.full_name ?? user.email}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app/settings/profile">{t("Meu perfil")}</Link>
          </DropdownMenuItem>
          {linha && (
            <div className="flex items-center justify-between px-2 py-1.5 text-sm">
              <span>{t("Tema")}</span>
              <ThemeToggle />
            </div>
          )}
          <DropdownMenuSeparator />
          {/*
            A PORTA DO MODO ADMINISTRADOR.

            Até aqui só se chegava ao painel da instalação digitando /admin na
            barra de endereços, ou por um item chamado "Gerenciar organizações"
            escondido no seletor de organização — que leva a UMA tela do painel e
            não anuncia que existe um painel.

            Ela não entra em `lib/navigation/registry.ts` de propósito: aquele
            registro descreve a navegação do TENANT (`app/app/**`), e o teste de
            completude varre só aquela raiz — uma entrada para /admin reprovaria
            o CI como link morto. Além disso o registro não sabe expressar "só o
            dono do servidor": o campo `platform` que existe lá é um atalho que
            ABRE tudo para quem é dono, não um cadeado que restringe aos outros.
            Mesmo precedente de `VersionFooter`: porta bespoke, gate próprio.

            O rótulo diz MODO, não "admin": para quem instalou o sistema, o que
            ele quer não é "uma área chamada admin", é "ir para onde eu mexo no
            servidor" — e o subtítulo diz de que servidor se trata.
          */}
          {user.is_platform_admin && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/admin" data-testid="porta-modo-administrador">
                  <ShieldCheck size={16} className="mr-2" aria-hidden />
                  <span className="flex flex-col">
                    <span>{t("Modo administrador")}</span>
                    <span className="text-xs text-muted-foreground">
                      {t("Configurar este servidor")}
                    </span>
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem disabled={isPending} onClick={() => startTransition(async () => { await signOut(); })}>
            <SignOut size={16} className="mr-2" aria-hidden />
            {t("Sair")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
