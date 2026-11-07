"use client";

import { ChatCircle, InstagramLogo, MessengerLogo, WhatsappLogo } from "@/lib/ui/icons";
import { channelBrand } from "@/lib/channels/presentation";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";
import type { ChannelSummary } from "@/hooks/inbox/useConversationsRealtime";

const brands = {
  whatsapp: { Icon: WhatsappLogo, label: "WhatsApp", color: "text-[#128c4a] dark:text-[#25d366]" },
  instagram: { Icon: InstagramLogo, label: "Instagram", color: "text-[#c13584] dark:text-[#f472b6]" },
  messenger: { Icon: MessengerLogo, label: "Messenger", color: "text-[#0866ff] dark:text-[#60a5fa]" },
  unknown: { Icon: ChatCircle, label: "Canal", color: "text-muted-foreground" },
};

export function ChannelLogo({ channel, size = 18, className }: {
  channel?: ChannelSummary | null;
  size?: number;
  className?: string;
}) {
  const t = useT();
  // Sem canal associado (conversa antiga, sessão removida), a conversa veio do
  // WhatsApp — o canal primário do produto. Rede social desconhecida segue
  // com o balão neutro.
  const bruta = channel ? channelBrand(channel) : "whatsapp";
  // Provedor que a lista não reconhece, sem ser rede social: é WhatsApp, o
  // único canal de conversa por número que a instalação liga.
  const marca =
    bruta === "unknown" && !(channel as { social_platform?: string | null } | null)?.social_platform
      ? "whatsapp"
      : bruta;
  if (marca === "whatsapp") {
    // O selo verde com o ícone branco no canto da foto: identifica o canal de
    // relance, sem precisar ler.
    return (
      <span
        role="img"
        aria-label="WhatsApp"
        title="WhatsApp"
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[#25d366]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/canais/whatsapp.png" alt="" className="h-[78%] w-[78%] object-contain" />
        </span>
      </span>
    );
  }
  const { Icon, label, color } = brands[marca];
  const name = label === "Canal" ? t("Canal") : label;
  return <span role="img" aria-label={name} title={name} className={cn("inline-flex shrink-0 items-center justify-center", color, className)}>
    <Icon size={size} weight="fill" aria-hidden />
  </span>;
}
