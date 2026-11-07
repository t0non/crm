"use client";
/* eslint-disable @next/next/no-img-element -- Avatares locais do catálogo. */
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, ImageIcon } from "lucide-react";
import {
  AVATARES_DE_BOAS_VINDAS,
  boasVindasSchema,
  type BoasVindasInput,
  type BoasVindasSalvas,
} from "@/lib/auth/boas-vindas";
import { salvarBoasVindas } from "@/app/actions/settings/salvarBoasVindas";
import { useEnvioComTeto, AvisoSemResposta } from "@/components/auth/teto-da-espera";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useMarcaDaInstalacao } from "@/lib/branding/contexto";
import { fonteEuclid } from "@/lib/ui/fonte-euclid";
import s from "./BoasVindas.module.css";

export function PreferenciasBoasVindas({
  nome,
  initial,
  modal = false,
  onConcluido,
}: {
  nome: string;
  initial?: BoasVindasSalvas | null;
  modal?: boolean;
  onConcluido?: () => void;
}) {
  const router = useRouter();
  const [avatar, setAvatar] = useState<BoasVindasInput["avatar"]>(initial?.avatar ?? "coracao");
  const [suporte, setSuporte] = useState<BoasVindasInput["suporte"]>(
    initial?.suporte ?? "whatsapp",
  );
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const { enviar, pendente, semResposta } = useEnvioComTeto();
  const titulo = `Torne ${nome} sua`;
  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSalvo(false);
    const input = { avatar, suporte, telefone };
    if (!boasVindasSchema.safeParse(input).success) {
      setError("Informe um telefone válido com código do país, ou deixe o campo vazio.");
      return;
    }
    void enviar(
      () => salvarBoasVindas(input),
      (result) => {
        if (!result?.ok) {
          setError(result?.error ?? "Não foi possível salvar. Tente novamente.");
          return;
        }
        setSalvo(true);
        onConcluido?.();
        router.refresh();
      },
    );
  }
  const form = (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.content}>
        {modal ? (
          <Dialog.Title className={s.title}>{titulo}</Dialog.Title>
        ) : (
          <h2 className={s.title}>Seu avatar e suas preferências</h2>
        )}
        <fieldset disabled={pendente}>
          <legend>Escolha seu avatar</legend>
          <div className={s.avatars}>
            {AVATARES_DE_BOAS_VINDAS.map((item) => (
              <label key={item.id} className={s.avatar} data-selected={avatar === item.id}>
                <input
                  type="radio"
                  name="avatar-boas-vindas"
                  value={item.id}
                  checked={avatar === item.id}
                  onChange={() => setAvatar(item.id)}
                  aria-label={item.nome}
                />
                {item.imagem ? (
                  <img src={item.imagem} alt="" width={72} height={72} />
                ) : (
                  <ImageIcon size={25} aria-hidden="true" />
                )}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={s.label} htmlFor="boas-vindas-suporte">
          Escolha sua preferência de suporte
        </label>
        <div className={s.supportSelect}>
          {suporte === "whatsapp" && (
            <img
              src="/landing-reference/whatsapp.png"
              alt=""
              aria-hidden="true"
              width={18}
              height={18}
            />
          )}
          <select
            id="boas-vindas-suporte"
            value={suporte}
            onChange={(e) => setSuporte(e.target.value as BoasVindasInput["suporte"])}
            disabled={pendente}
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail da conta</option>
          </select>
        </div>
        <label className={s.label} htmlFor="boas-vindas-telefone">
          Número de telefone
        </label>
        <div className={s.phone}>
          <span aria-hidden="true">
            <svg width="20" height="14" viewBox="0 0 24 16">
              <rect width="24" height="16" fill="#169b43" />
              <path d="M12 2 22 8 12 14 2 8Z" fill="#ffe33c" />
              <circle cx="12" cy="8" r="4" fill="#2359a5" />
              <path d="M8 7 Q12 6 16 9" stroke="white" fill="none" strokeWidth=".8" />
            </svg>
          </span>
          <input
            id="boas-vindas-telefone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+55"
            value={telefone}
            maxLength={30}
            onChange={(e) => setTelefone(e.target.value)}
            disabled={pendente}
            aria-describedby="boas-vindas-ajuda"
          />
        </div>
        <p id="boas-vindas-ajuda" className={s.help}>
          Opcional. Inclua o código do país, por exemplo +55.
        </p>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        {semResposta && <AvisoSemResposta />}
        {salvo && !modal && <p role="status">Preferências salvas.</p>}
      </div>
      <footer className={s.footer}>
        {modal && (
          <button type="button" className={s.skip} onClick={onConcluido} disabled={pendente}>
            Agora não
          </button>
        )}
        <button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : modal ? "Próximo" : "Salvar preferências"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </footer>
    </form>
  );
  return modal ? (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !pendente) onConcluido?.();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={`${s.modal} ${fonteEuclid.variable}`}
          aria-describedby={undefined}
        >
          {form}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ) : (
    <section className={`${s.panel} ${fonteEuclid.variable}`}>{form}</section>
  );
}

export function BoasVindasGate() {
  const { user, activeOrg } = useAuth();
  const marca = useMarcaDaInstalacao();
  const [adiado, setAdiado] = useState(false);
  if (!activeOrg || user.support || user.boas_vindas || adiado) return null;
  return (
    <PreferenciasBoasVindas
      nome={activeOrg.marca?.nome ?? marca.name}
      modal
      onConcluido={() => setAdiado(true)}
    />
  );
}
