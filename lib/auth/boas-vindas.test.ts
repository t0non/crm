import { describe, it, expect } from "vitest";
import { boasVindasSchema, lerBoasVindas, caminhoDoAvatar } from "./boas-vindas";
describe("preferências de primeiro acesso", () => {
  it("não considera um perfil incompleto como concluído", () => {
    expect(lerBoasVindas(null)).toBeNull();
    expect(lerBoasVindas({ avatar: "coracao", suporte: "email", telefone: "" })).toBeNull();
  });
  it("reconhece a conclusão persistida e normaliza o telefone", () => {
    const input = {
      avatar: "coracao",
      suporte: "whatsapp",
      telefone: "+55 (11) 99999-9999",
      concluido_em: "2026-11-07T12:00:00.000Z",
    };
    expect(lerBoasVindas(input)?.telefone).toBe("+5511999999999");
  });
  it("recusa avatar externo, telefone inválido e campo de usuário injetado", () => {
    expect(
      boasVindasSchema.safeParse({
        avatar: "https://externo.example/a.png",
        suporte: "email",
        telefone: "",
      }).success,
    ).toBe(false);
    expect(
      boasVindasSchema.safeParse({ avatar: "coracao", suporte: "email", telefone: "abc" }).success,
    ).toBe(false);
    expect(
      boasVindasSchema.safeParse({
        avatar: "coracao",
        suporte: "email",
        telefone: "",
        user_id: "outra-pessoa",
      }).success,
    ).toBe(false);
  });
  it("permite não informar telefone e usa apenas avatares locais", () => {
    expect(
      boasVindasSchema.safeParse({ avatar: "atual", suporte: "email", telefone: "" }).success,
    ).toBe(true);
    expect(caminhoDoAvatar("atual")).toBeNull();
    expect(caminhoDoAvatar("raio")).toBe("/landing-reference/avatar-raio.png");
  });
});
