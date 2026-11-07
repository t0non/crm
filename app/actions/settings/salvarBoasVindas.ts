"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { boasVindasSchema, caminhoDoAvatar, type BoasVindasInput } from "@/lib/auth/boas-vindas";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";

export async function salvarBoasVindas(
  input: BoasVindasInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = boasVindasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Confira os dados e o número de telefone." };
  const user = await loadAuthUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  if (user.support)
    return { ok: false, error: "O acompanhamento não pode alterar o perfil pessoal." };
  const supabase = await createClient();
  const avatar = caminhoDoAvatar(parsed.data.avatar);
  const { error } = await supabase.auth.updateUser({
    data: {
      boas_vindas: { ...parsed.data, concluido_em: new Date().toISOString() },
      ...(avatar ? { avatar_url: new URL(avatar, env.NEXT_PUBLIC_APP_URL).href } : {}),
    },
  });
  if (error) return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  const org = await resolveActiveOrg(user);
  const hdrs = await headers();
  await audit({
    action: "profile.updated",
    actorUserId: user.id,
    organizationId: org?.orgId ?? null,
    resourceType: "user",
    resourceId: user.id,
    requestId: hdrs.get("x-request-id"),
    metadata: { etapa: "boas_vindas", avatar: parsed.data.avatar, suporte: parsed.data.suporte },
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}
