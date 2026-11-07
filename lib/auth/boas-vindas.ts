import { z } from "zod";

export const AVATARES_DE_BOAS_VINDAS = [
  { id: "atual", nome: "Meu avatar atual", imagem: null },
  { id: "coracao", nome: "Coração", imagem: "/landing-reference/login-heart.png" },
  { id: "microfone", nome: "Microfone", imagem: "/landing-reference/avatar-microfone.png" },
  { id: "raio", nome: "Raio", imagem: "/landing-reference/avatar-raio.png" },
  { id: "estrela", nome: "Estrela", imagem: "/landing-reference/avatar-estrela.png" },
  { id: "carteira", nome: "Carteira", imagem: "/landing-reference/avatar-carteira.png" },
] as const;
export const boasVindasSchema = z
  .object({
    avatar: z.enum(["atual", "coracao", "microfone", "raio", "estrela", "carteira"]),
    suporte: z.enum(["whatsapp", "email"]),
    telefone: z
      .string()
      .trim()
      .max(30)
      .transform((value) => value.replace(/[\s().-]/g, ""))
      .refine(
        (value) => value === "" || /^\+[1-9]\d{7,14}$/.test(value),
        "Informe um telefone válido com código do país.",
      ),
  })
  .strict();
export type BoasVindasInput = z.input<typeof boasVindasSchema>;
export const boasVindasSalvasSchema = boasVindasSchema.extend({ concluido_em: z.iso.datetime() });
export type BoasVindasSalvas = z.output<typeof boasVindasSalvasSchema>;
export function lerBoasVindas(value: unknown): BoasVindasSalvas | null {
  const parsed = boasVindasSalvasSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function caminhoDoAvatar(avatar: BoasVindasInput["avatar"]): string | null {
  return AVATARES_DE_BOAS_VINDAS.find((item) => item.id === avatar)?.imagem ?? null;
}
