import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./landing-page";
import { CAMINHO_CADASTRO_COMERCIAL } from "@/lib/cobranca/jornada";

vi.mock("next/font/local", () => ({ default: () => ({ variable: "test-euclid-font" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/actions/auth/signInWithPassword", () => ({
  signInWithPassword: vi.fn(async () => ({ ok: false, error: "invalid_credentials" })),
}));
vi.mock("@/app/actions/auth/signInWithGoogle", () => ({
  signInWithGoogle: vi.fn(async () => ({ ok: false, error: "google_indisponivel" })),
}));
afterEach(cleanup);
describe("landing pública", () => {
  it("mantém os destinos comerciais locais e a marca da instalação", () => {
    render(<LandingPage nome="Marca de teste" />);
    expect(screen.getByRole("link", { name: "Marca de teste — início" })).toHaveAttribute(
      "href",
      "/",
    );
    for (const link of screen.getAllByRole("link", { name: "Começar agora" })) {
      expect(link).toHaveAttribute("href", CAMINHO_CADASTRO_COMERCIAL);
    }
    for (const link of screen.getAllByRole("link", { name: "Iniciar sessão" })) {
      expect(link).toHaveAttribute("href", "/login?next=%2Fapp%2Finbox");
    }
    expect(
      screen.getAllByRole("link").some((link) => link.getAttribute("href")?.includes("kommo.com")),
    ).toBe(false);
  });
  it("troca a demonstração por clique e pelo teclado com foco na aba selecionada", () => {
    render(<LandingPage nome="Marca de teste" />);
    const automate = screen.getByRole("tab", { name: "Automatize" });
    fireEvent.click(automate);
    expect(automate).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Automatize");
    fireEvent.keyDown(automate, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Escale" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Escale");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Escale" }), { key: "Home" });
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("Capture");
  });
  it("fecha o menu após escolher um destino e permite dispensar o aviso", () => {
    render(<LandingPage nome="Marca de teste" />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("navigation", { name: "Navegação móvel" })).toBeInTheDocument();
    fireEvent.click(
      screen
        .getByRole("navigation", { name: "Navegação móvel" })
        .querySelector('a[href="#plano"]')!,
    );
    expect(screen.queryByRole("navigation", { name: "Navegação móvel" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByRole("button", { name: "Fechar aviso" })).not.toBeInTheDocument();
  });
});

it("abre e fecha o login na própria landing sem navegar e usa a autenticação existente", async () => {
  const { signInWithPassword } = await import("@/app/actions/auth/signInWithPassword");
  render(<LandingPage nome="Marca de teste" />);
  const url = window.location.href;
  fireEvent.click(screen.getAllByRole("link", { name: "Iniciar sessão" })[0]!);
  expect(screen.getByRole("dialog", { name: "Faça login" })).toBeInTheDocument();
  expect(window.location.href).toBe(url);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teste@example.com" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaDeTeste123!" } });
  fireEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));
  expect(screen.getByLabelText("Senha")).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", { name: "Iniciar sessão" }));
  await waitFor(() =>
    expect(signInWithPassword).toHaveBeenCalledWith(
      { email: "teste@example.com", password: "SenhaDeTeste123!" },
      "/app/inbox",
    ),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Email ou senha incorretos.");
  fireEvent.click(screen.getByRole("button", { name: "Fechar login" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
