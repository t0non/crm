import { House } from "@/lib/ui/icons";

import type { NavDestination, NavGroup } from "./registry";

export interface GrupoDaComposicao {
  group: Omit<NavGroup, "id"> & { id: string; direto?: boolean };
  items: NavDestination[];
}

/**
 * Menu do dia a dia: só o essencial, no padrão de CRM de conversa (inbox,
 * funil, calendário, listas, IA, canais, insights).
 *
 * Só reorganiza e renomeia destinos que o registro JÁ autorizou para esta
 * pessoa — nunca acrescenta tela. O que sai daqui continua alcançável pelo hub
 * do grupo ("Ver tudo em …") e pela busca ⌘K; por isso só sai do menu destino
 * de grupo que TEM hub. Grupo sem hub (Comunicações, Canais) fica inteiro.
 */
const FORA_DO_MENU = new Set([
  // CRM (tem hub)
  "/app/prospecting",
  "/app/comandas",
  "/app/products",
  // IA (tem hub)
  "/app/ai/cases",
  "/app/ai/providers",
  // Análise (tem hub)
  "/app/ads/meta",
]);

/**
 * Fora do menu por escolha do dono, mesmo em grupo sem hub: a tela continua
 * existindo (busca ⌘K e link direto), só não ocupa lugar no dia a dia.
 */
const OCULTOS = new Set(["/app/webhooks", "/app/radar"]);

/** Nomes curtos e diretos, no vocabulário de quem atende. */
const ROTULO: Record<string, string> = {
  "/app/inbox": "Inbox de chat",
  "/app/kanban": "Funil de vendas",
  "/app/ai/agents": "Agentes",
};

const LISTAS = ["/app/contacts", "/app/companies", "/app/people"];

/** Automações: o que a conta faz sozinha ou em lote. Ordem = ordem no menu. */
const AUTOMACOES: Record<string, string> = {
  "/app/templates": "Modelos",
  "/app/campaigns": "Transmissão",
  "/app/ai/followups": "Follow-ups",
};

export function comporNavegacaoCrm(
  origem: Array<{ group: NavGroup; items: NavDestination[] }>,
): GrupoDaComposicao[] {
  const renomear = (d: NavDestination): NavDestination =>
    ROTULO[d.href] ? { ...d, label: ROTULO[d.href] } : d;
  const todos = origem.flatMap((g) => g.items);
  const agenda = todos.filter((d) => d.href === "/app/agenda");
  const listas = todos.filter((d) => LISTAS.includes(d.href));
  const automacoes = Object.keys(AUTOMACOES).flatMap((href) => {
    const d = todos.find((x) => x.href === href);
    return d ? [{ ...d, label: AUTOMACOES[href] }] : [];
  });
  const destacados = new Set([...agenda, ...listas, ...automacoes].map((d) => d.href));

  const blocoAgendaEListas = (): GrupoDaComposicao[] => [
    ...(agenda.length
      ? [{ group: { id: "calendario", label: "Calendário", direto: true }, items: agenda }]
      : []),
    ...(listas.length ? [{ group: { id: "listas", label: "Listas" }, items: listas }] : []),
  ];

  // "Início" é a primeira porta de todo mundo: o resumo do dia e os
  // primeiros passos (app/app/inicio). Não depende de papel — só lê.
  const inicio = {
    href: "/app/inicio",
    label: "Início",
    icon: House,
    group: "atendimento",
  } as unknown as NavDestination;
  const resultado: GrupoDaComposicao[] = [
    { group: { id: "inicio", label: "Início", direto: true }, items: [inicio] },
  ];
  for (const original of origem) {
    const items = original.items
      .filter((d) => !destacados.has(d.href))
      .filter((d) => !(original.group.hub && FORA_DO_MENU.has(d.href)))
      .filter((d) => !OCULTOS.has(d.href))
      .map(renomear);
    if (items.length || original.group.hub) resultado.push({ group: original.group, items });
    if (original.group.id === "crm") resultado.push(...blocoAgendaEListas());
    if (original.group.id === "ia" && automacoes.length)
      resultado.push({ group: { id: "automacoes", label: "Automações" }, items: automacoes });
  }
  if (automacoes.length && !resultado.some((g) => g.group.id === "automacoes"))
    resultado.push({ group: { id: "automacoes", label: "Automações" }, items: automacoes });
  // A organização pode ocultar CRM e manter a agenda: a porta continua visível.
  if (!origem.some((g) => g.group.id === "crm")) resultado.push(...blocoAgendaEListas());
  return resultado;
}
