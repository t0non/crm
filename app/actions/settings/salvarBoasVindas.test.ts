import { describe, it, expect, vi, beforeEach } from "vitest";
import { salvarBoasVindas } from "./salvarBoasVindas";
const mocks = vi.hoisted(() => ({
  user: { id: "pessoa-a", support: null as unknown },
  update: vi.fn(),
  audit: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({
  loadAuthUser: vi.fn(() => mocks.user),
  resolveActiveOrg: vi.fn(() => ({ orgId: "empresa-a" })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({ auth: { updateUser: mocks.update } })),
}));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_APP_URL: "https://crm.example.com" } }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.support = null;
  mocks.update.mockResolvedValue({ error: null });
});
describe("salvar boas-vindas", () => {
  it("grava na identidade da sessão, conclui e audita sem telefone", async () => {
    const result = await salvarBoasVindas({
      avatar: "estrela",
      suporte: "whatsapp",
      telefone: "+55 (11) 99999-9999",
    });
    expect(result.ok).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith({
      data: {
        avatar_url: "https://crm.example.com/landing-reference/avatar-estrela.png",
        boas_vindas: {
          avatar: "estrela",
          suporte: "whatsapp",
          telefone: "+5511999999999",
          concluido_em: expect.any(String),
        },
      },
    });
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "pessoa-a",
        organizationId: "empresa-a",
        action: "profile.updated",
      }),
    );
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("99999");
    expect(mocks.revalidate).toHaveBeenCalledWith("/app", "layout");
  });
  it("não altera dados durante suporte", async () => {
    mocks.user.support = { access_mode: "support_readonly" };
    expect((await salvarBoasVindas({ avatar: "coracao", suporte: "email", telefone: "" })).ok).toBe(
      false,
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("não audita nem conclui uma gravação recusada", async () => {
    mocks.update.mockResolvedValue({ error: { message: "falha" } });
    expect((await salvarBoasVindas({ avatar: "coracao", suporte: "email", telefone: "" })).ok).toBe(
      false,
    );
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("não permite escolher outro usuário nem endereço de avatar arbitrário", async () => {
    await salvarBoasVindas({
      avatar: "atual",
      suporte: "email",
      telefone: "",
      user_id: "outra-pessoa",
    } as never);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
