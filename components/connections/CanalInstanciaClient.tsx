"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Status = { state: string; qr: string | null; sessionId: string | null; label: string };
const labels: Record<string, string> = {
  not_configured: "Não configurada nesta organização",
  connecting: "Conectando",
  connected: "Conectada",
  disconnected: "Desconectada",
  hibernated: "Desconectada (sessão pausada)",
};

export function CanalInstanciaClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useCallback(async (action?: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        "/api/v1/channel-sessions/instance",
        action
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action }),
            }
          : { cache: "no-store" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Falha ao consultar conexão.");
      if (action === "replay") setNotice(`Recebimentos reprocessados: ${body.data.processed}`);
      else if (action === "webhook")
        setNotice("Webhook registrado. Confirme o recebimento de uma mensagem real no Inbox.");
      else {
        setStatus(body.data);
        setNotice("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void request();
    }, 0);
    return () => clearTimeout(timer);
  }, [request]);
  useEffect(() => {
    if (!status?.sessionId || busy) return;
    const id = setTimeout(
      () => {
        void request();
      },
      status.state === "connecting" ? 4000 : 20000,
    );
    return () => clearTimeout(id);
  }, [request, status?.state, status?.sessionId, busy]);
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h3 className="font-semibold">{status?.label || "WhatsApp por instância"}</h3>
      <p role="status">
        {error
          ? "Não foi possível verificar a conexão"
          : status
            ? labels[status.state] || "Estado desconhecido"
            : "Consultando conexão…"}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && <p className="text-sm">{notice}</p>}
      <p className="text-sm text-muted-foreground">
        O endereço do serviço e o token são configurados exclusivamente no servidor. O atendimento é
        manual; nenhuma IA será ativada.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void request("bind")}>
          Vincular instância configurada
        </Button>
        <Button
          variant="outline"
          disabled={
            busy ||
            !status?.sessionId ||
            status.state === "connected" ||
            status.state === "connecting"
          }
          onClick={() => void request("connect")}
        >
          Conectar por QR Code
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void request()}>
          Atualizar status
        </Button>
        <Button
          variant="outline"
          disabled={busy || !status?.sessionId}
          onClick={() => void request("webhook")}
        >
          Registrar webhook
        </Button>
        <Button
          variant="outline"
          disabled={busy || !status?.sessionId}
          onClick={() => void request("replay")}
        >
          Reprocessar recebimentos pendentes
        </Button>
      </div>
      {status?.state === "connecting" && status.qr && (
        // QR efêmero produzido pela API autenticada, nunca uma URL remota arbitrária.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={status.qr} alt="QR Code para conectar o WhatsApp" width={280} height={280} />
      )}
      {status?.state === "connecting" && !status.qr && (
        <p>Aguardando QR Code da instância. O status será atualizado automaticamente.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Para receber mensagens, o webhook precisa de um endereço público HTTPS que encaminhe para
        este aplicativo. O endereço local não é acessível pela instância.
      </p>
    </section>
  );
}
