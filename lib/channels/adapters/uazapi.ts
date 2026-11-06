import type { ChannelAdapter } from "../types";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertInstanceSession } from "../uazapi/session";
import { assertUrlDeMidiaSegura } from "@/lib/messaging/media/url-de-midia-externa";
import {
  canonicalMessageId,
  instanceCredentials,
  instanceRequest,
  readInstance,
  sentMessageSchema,
} from "../uazapi/client";

export const uazapiAdapter: ChannelAdapter = {
  provider: "uazapi",
  codes: {
    notConfigured: "uazapi_not_configured",
    sendFailed: "uazapi_error",
    unknownError: "uazapi_unknown",
  },
  isConfigured: () => Boolean(instanceCredentials()),
  resolveRecipient(input) {
    if (input.isGroup) return null;
    return input.phoneNumber?.replace(/\D/g, "") || null;
  },
  canonicalExternalId: canonicalMessageId,
  echoExternalIds: ({ externalId }) => [canonicalMessageId(externalId)],
  async checkHealth(input) {
    try {
      await assertInstanceSession(createAdminClient(), input.organizationId, input.sessionRef);
      const state = await readInstance();
      if (state.id !== input.sessionRef) throw new Error("uazapi_instance_mismatch");
      return { reachable: true, status: state.status, detail: null };
    } catch {
      return {
        reachable: false,
        status: null,
        detail: "Não foi possível verificar a instância configurada.",
      };
    }
  },
  async send(input) {
    if (!["text", "image", "audio"].includes(input.kind))
      throw new Error("uazapi_kind_not_supported");
    if (input.kind !== "text") {
      if (!input.media) throw new Error("uazapi_media_missing");
      await assertUrlDeMidiaSegura(input.media.url);
    }
    await assertInstanceSession(createAdminClient(), input.organizationId, input.sessionRef);
    const state = await readInstance();
    if (state.id !== input.sessionRef || state.state !== "connected")
      throw new Error("uazapi_session_unavailable");
    await input.beforeSend?.();
    const raw = sentMessageSchema.parse(
      await instanceRequest(
        input.kind === "text" ? "/send/text" : "/send/media",
        {
          number: input.to,
          ...(input.kind === "text"
            ? { text: input.body ?? "" }
            : {
                type: input.kind === "audio" ? "ptt" : "image",
                file: input.media!.url,
                mimetype: input.media!.mime,
                ...(input.kind === "image"
                  ? { text: input.media!.caption ?? input.body ?? "" }
                  : {}),
              }),
          ...(input.replyToExternalId
            ? { replyid: input.replyToExternalId.replace(/^uazapi:/, "") }
            : {}),
        },
        input.kind === "text" ? 8000 : 25000,
      ),
    );
    return { externalId: canonicalMessageId(raw.messageid || raw.id!) };
  },
};
