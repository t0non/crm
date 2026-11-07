import "@testing-library/jest-dom/vitest";
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { PreferenciasBoasVindas, BoasVindasGate } from "./BoasVindas";
import { salvarBoasVindas } from "@/app/actions/settings/salvarBoasVindas";
const auth = vi.hoisted(() => ({
  user: { support: null as unknown, boas_vindas: null as unknown },
  activeOrg: { name: "Empresa", marca: { nome: "Minha Marca" } },
}));
vi.mock("next/font/local", () => ({ default: () => ({ variable: "fonte-teste" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => auth }));
vi.mock("@/lib/branding/contexto", () => ({
  useMarcaDaInstalacao: () => ({ name: "Minha Marca" }),
}));
vi.mock("@/app/actions/settings/salvarBoasVindas", () => ({ salvarBoasVindas: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  auth.user.boas_vindas = null;
  auth.user.support = null;
});
describe("boas-vindas", () => {
  it("aparece para perfil novo e não reaparece quando já concluído", () => {
    const view = render(<BoasVindasGate />);
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Torne Minha Marca sua");
    view.unmount();
    auth.user.boas_vindas = { concluido_em: "2026-11-07T12:00:00Z" };
    render(<BoasVindasGate />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("não solicita preferências durante acompanhamento de suporte", () => {
    auth.user.support = { access_mode: "support_readonly" };
    render(<BoasVindasGate />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("mantém o modal e as escolhas quando a gravação falha", async () => {
    vi.mocked(salvarBoasVindas).mockResolvedValue({ ok: false, error: "Não foi possível salvar." });
    const complete = vi.fn();
    render(<PreferenciasBoasVindas nome="Minha Marca" modal onConcluido={complete} />);
    fireEvent.click(screen.getByRole("radio", { name: "Estrela" }));
    fireEvent.change(screen.getByLabelText("Número de telefone"), {
      target: { value: "+5511999999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar.");
    expect(screen.getByRole("radio", { name: "Estrela" })).toBeChecked();
    expect(complete).not.toHaveBeenCalled();
  });
  it("só conclui depois de salvar os dados válidos", async () => {
    vi.mocked(salvarBoasVindas).mockResolvedValue({ ok: true });
    const complete = vi.fn();
    render(<PreferenciasBoasVindas nome="Minha Marca" modal onConcluido={complete} />);
    fireEvent.change(screen.getByLabelText("Número de telefone"), {
      target: { value: "inválido" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(salvarBoasVindas).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Número de telefone"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(1));
  });
});
