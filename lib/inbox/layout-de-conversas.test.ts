import { describe, it, expect } from "vitest";
import {
  gradeDeConversas,
  padraoDaReferencia,
  fichaPeloPonteiro,
  divisoriaDaFicha,
} from "./layout-de-conversas";
import { faixaDaLargura, moverPorSeta } from "./larguras-do-inbox";
describe("composição da Inbox", () => {
  it("reserva a ficha antes da conversa e mantém a conversa flexível", () => {
    expect(gradeDeConversas({ temFicha: true }, { lista: 500, ficha: 390 }, false)).toBe(
      "500px 390px minmax(0,1fr)",
    );
    expect(gradeDeConversas({ temFicha: true }, { lista: 500, ficha: 390 }, true)).toBe(
      "500px 2.75rem minmax(0,1fr)",
    );
    expect(gradeDeConversas({ temFicha: false }, { lista: 300, ficha: 390 }, false)).toBe(
      "300px minmax(0,1fr)",
    );
  });
  it("a divisória acompanha o fim da ficha central e o ponteiro segue a mesma medida", () => {
    const widths = { lista: 500, ficha: 390 };
    expect(divisoriaDaFicha(widths)).toBe(890);
    expect(fichaPeloPonteiro(1130, 240, widths.lista)).toBe(widths.ficha);
    expect(fichaPeloPonteiro(1170, 240, widths.lista)).toBe(430);
  });
  it("a seta direita expande a ficha central sem mudar o contrato antigo", () => {
    expect(moverPorSeta("ficha", 390, "ArrowRight", "centro")).toBe(406);
    expect(moverPorSeta("ficha", 390, "ArrowRight")).toBe(374);
  });
  it("o padrão amplo preserva o piso da conversa quando a janela aperta", () => {
    const faixa = faixaDaLargura(1920)!;
    expect(padraoDaReferencia(faixa, 1680, true)).toEqual({ lista: 500, ficha: 390 });
    const narrow = padraoDaReferencia(faixa, 1200, true);
    expect(1200 - narrow.lista - narrow.ficha).toBeGreaterThanOrEqual(420);
  });
});
