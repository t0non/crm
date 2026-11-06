import { expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const advanced = vi.hoisted(() => vi.fn());
vi.mock("./_advanced", () => {
  advanced();
  return { default: () => <div>Configuração avançada</div> };
});
vi.mock("@/app/actions/onboarding/continueWithoutAi", () => ({ continueWithoutAi: vi.fn() }));
import Page from "./page";

it("oferece atendimento manual sem carregar a configuração avançada", async () => {
  render(await Page({ searchParams: Promise.resolve({}) }));
  expect(
    screen.getByRole("button", { name: "Continuar sem IA (atendimento manual)" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Configurar IA agora (opcional)" })).toHaveAttribute(
    "href",
    "/onboarding/setup-ai?advanced=1",
  );
  expect(advanced).not.toHaveBeenCalled();
  cleanup();
});

it("mantém a configuração original disponível por escolha explícita", async () => {
  render(await Page({ searchParams: Promise.resolve({ advanced: "1" }) }));
  expect(screen.getByText("Configuração avançada")).toBeInTheDocument();
  expect(advanced).toHaveBeenCalledOnce();
  cleanup();
});
