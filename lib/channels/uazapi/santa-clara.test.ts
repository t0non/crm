import { describe, expect, it } from "vitest";
import { santaClaraGreeting, santaClaraKeyword } from "./santa-clara";

describe("roteamento por palavras-chave do Santa Clara", () => {
  it.each([
    ["Oi, que horas vocês abrem?", "horarios"],
    ["Onde fica o laboratório?", "horarios"],
    ["Quanto fica esse exame?", "orcamento"],
    ["Vocês aceitam meu convênio?", "orcamento"],
    ["Quero falar com a recepção", "recepcao"],
    ["jae dps vou ai", "pretende"],
    ["vou ai amaha", "pretende"],
  ])("encaminha %s para %s", (texto, destino) => {
    expect(santaClaraKeyword(texto)).toBe(destino);
  });

  it.each([
    "Não vou aí amanhã",
    "Talvez eu vá amanhã",
    "vou ai amaha?",
    "Vou aí amanhã se der",
    "Qual o preço e que horas abre?",
    "Que horas sai meu resultado?",
    "Qual o horário de jejum?",
  ])("deixa %s com a recepção", (texto) => {
    expect(santaClaraKeyword(texto)).toBeNull();
  });

  it("distingue uma saudação de uma pergunta escrita", () => {
    expect(santaClaraGreeting("Olá!")).toBe(true);
    expect(santaClaraGreeting("Olá, que horas abrem?")).toBe(false);
  });
});
