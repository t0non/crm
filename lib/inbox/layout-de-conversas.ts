import type { Faixa, LargurasDoInbox } from "./larguras-do-inbox";
import { resolverLarguras } from "./larguras-do-inbox";

/** Ordem desktop: lista → ficha → conversa. A ficha recolhida ocupa só o trilho. */
export function gradeDeConversas(
  faixa: Pick<Faixa, "temFicha">,
  larguras: LargurasDoInbox,
  recolhido: boolean,
): string {
  if (!faixa.temFicha) return `${larguras.lista}px minmax(0,1fr)`;
  return `${larguras.lista}px ${recolhido ? "2.75rem" : `${larguras.ficha}px`} minmax(0,1fr)`;
}
export function padraoDaReferencia(
  faixa: Faixa,
  larguraContainer: number,
  temFicha: boolean,
): LargurasDoInbox {
  return resolverLarguras({
    lista: faixa.id === "2xl" ? 500 : faixa.lista,
    ficha: faixa.id === "2xl" ? 390 : faixa.ficha,
    larguraContainer,
    temFicha,
  });
}
export function fichaPeloPonteiro(clientX: number, esquerdaDaGrade: number, lista: number): number {
  return clientX - esquerdaDaGrade - lista;
}
export function divisoriaDaFicha(larguras: LargurasDoInbox): number {
  return larguras.lista + larguras.ficha;
}
