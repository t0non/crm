/**
 * A FOTO PADRÃO DO CONTATO: quem não tem foto ganha uma das dez ilustrações (Notionists, licença CC0) de
 * `public/avatares/`, sempre a mesma para o mesmo contato (sorteada pelo id).
 * Deixa a lista com cara de gente, sem depender de o WhatsApp mandar foto.
 */
export function avatarPadrao(chave: string | null | undefined): string {
  const texto = chave ?? "";
  let soma = 0;
  for (let i = 0; i < texto.length; i++) soma = (soma * 31 + texto.charCodeAt(i)) >>> 0;
  return `/avatares/${(soma % 10) + 1}.svg`;
}
