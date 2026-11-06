"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { patchOnboardingState, requireOnboardingCtx } from "./_shared";

export async function continueWithoutAi(): Promise<void> {
  const ctx = await requireOnboardingCtx();
  await patchOnboardingState(ctx.orgId, {
    ai: { agent_id: "", prompt_template: "skipped", skipped: true },
    teste: { skipped: true },
  });
  await audit({
    action: "onboarding.ai_skipped",
    actorUserId: ctx.userId,
    organizationId: ctx.orgId,
  });
  redirect("/onboarding");
}
