"use client";
/**
 * Nova transmissão — quatro passos curtos: Destinatários, Canal, Conteúdo e
 * Lançamento, com a prévia no celular ao lado.
 *
 * O SIMPLES NA FRENTE, O RESTO RECOLHIDO. Cada passo mostra só a pergunta que
 * todo mundo responde; os ajustes finos (outras etiquetas, base legal, ritmo,
 * quem atende a resposta) continuam aqui, dentro de "Mais opções". Nenhuma
 * regra mudou: o corpo do POST é o mesmo de antes.
 *
 * "Enviar agora" e "Programar" fazem o caminho que antes eram três telas:
 * criar o rascunho → preparar a lista → iniciar (ou agendar). Se um passo
 * recusa, a pessoa cai no detalhe da transmissão com o motivo na tela, e
 * nada é enviado sem a lista preparada.
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCriarCampanha,
  useModelosDaCampanha,
  usePreviaDaAudiencia,
} from "@/hooks/campanhas/useCampanhas";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import { useAgentesPublicados, useEtapas, useFunis } from "@/hooks/campanhas/useDestinoDaCampanha";
import { apiClient } from "@/lib/api/client";
import { VARIAVEIS_DA_CAMPANHA, DESCRICAO_DA_VARIAVEL } from "@/lib/campanhas/renderizador";
import {
  CaretDown,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Microphone,
  PencilSimple,
  Phone,
  Plus,
  VideoCamera,
} from "@/lib/ui/icons";
import { cn } from "@/lib/utils";

import {
  ModeloDaCampanha,
  variaveisIncompletas,
  type EscolhaDoModelo,
} from "../_components/ModeloDaCampanha";
import { VelocidadeDaCampanha, type Velocidade } from "../_components/VelocidadeDaCampanha";

type Segmento = "funil" | "etiqueta" | "parados";
type PassoId = "destinatarios" | "canal" | "conteudo" | "lancamento";

const SELECT =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm focus:border-accent focus:outline-hidden";

export function NovaCampanha() {
  const t = useT();
  const router = useRouter();
  const canais = useChannelSessions();
  const criar = useCriarCampanha();
  const previa = usePreviaDaAudiencia();

  const [nome, setNome] = useState(
    () => `${t("Transmissão")} (${new Date().toLocaleDateString("pt-BR")})`,
  );
  const [aberto, setAberto] = useState<PassoId | null>("destinatarios");

  // Destinatários
  const [segmento, setSegmento] = useState<Segmento>("funil");
  const [funilDoPublico, setFunilDoPublico] = useState("");
  const [etapaDoPublico, setEtapaDoPublico] = useState("");
  const [comAlgumaTag, setComAlgumaTag] = useState("");
  const [semTags, setSemTags] = useState("");
  const [semInteracao, setSemInteracao] = useState("");
  const [limite, setLimite] = useState("100");

  // Canal
  const [canal, setCanal] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [baseLegal, setBaseLegal] = useState<"consent" | "legitimate_interest">("consent");
  const [liaRef, setLiaRef] = useState("");

  // Conteúdo
  const [texto, setTexto] = useState("");
  const [modelo, setModelo] = useState<EscolhaDoModelo | null>(null);

  // Lançamento
  const [quando, setQuando] = useState<"agora" | "horario">("agora");
  const [horario, setHorario] = useState("");
  const [velocidade, setVelocidade] = useState<Velocidade>("gradual");
  const [intervalo, setIntervalo] = useState("");
  const [janelaInicio, setJanelaInicio] = useState("");
  const [janelaFim, setJanelaFim] = useState("");
  const [tetoDiario, setTetoDiario] = useState("");
  const [tetoHorario, setTetoHorario] = useState("");
  const [funil, setFunil] = useState("");
  const [etapa, setEtapa] = useState("");
  const [agente, setAgente] = useState("");

  const [enviando, setEnviando] = useState(false);

  // Um número só conectado: já vem escolhido. Ninguém precisa escolher entre um.
  const listaDeCanais = canais.data ?? [];
  useEffect(() => {
    if (!canal && listaDeCanais.length === 1) setCanal(listaDeCanais[0]!.id);
  }, [canal, listaDeCanais]);

  const doCanal = useModelosDaCampanha(canal);
  const ehOficial = doCanal.data?.modo === "template";
  const rapida = ehOficial && velocidade === "rapida";
  const providerDoCanal = listaDeCanais.find((c) => c.id === canal)?.provider ?? null;
  const modeloEscolhido =
    modelo && doCanal.data
      ? (doCanal.data.modelos.find((m) => m.name === modelo.name && m.language === modelo.language) ??
        null)
      : null;
  const modeloPronto =
    modelo !== null &&
    modeloEscolhido !== null &&
    variaveisIncompletas(modeloEscolhido, modelo.variables).length === 0;

  const funis = useFunis();
  const etapas = useEtapas(funil || null);
  const etapasDoPublico = useEtapas(funilDoPublico || null);
  const agentes = useAgentesPublicados();

  const filtro = useMemo(
    () => ({
      com_alguma_tag: listar(comAlgumaTag),
      sem_tags: listar(semTags),
      sem_interacao_ha_dias: semInteracao ? Number(semInteracao) : null,
      funis: funilDoPublico ? [funilDoPublico] : [],
      etapas: etapaDoPublico ? [etapaDoPublico] : [],
      limite: Number(limite) || 100,
    }),
    [comAlgumaTag, semTags, semInteracao, funilDoPublico, etapaDoPublico, limite],
  );

  const temCriterio =
    filtro.com_alguma_tag.length > 0 ||
    filtro.sem_tags.length > 0 ||
    filtro.funis.length > 0 ||
    filtro.etapas.length > 0 ||
    filtro.sem_interacao_ha_dias !== null;

  // A CONTA SAI SOZINHA: meio segundo depois de a pessoa parar de mexer no
  // público, a prévia conta quantos recebem. Antes era um botão que quase
  // ninguém apertava, e o resumo ao lado ficava em "—".
  const chaveDaPrevia = JSON.stringify(filtro);
  useEffect(() => {
    if (!temCriterio) return;
    const id = setTimeout(() => previa.mutate({ audience_filter: filtro, message_body: "" }), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDaPrevia, temCriterio]);

  const nomeDoCanal = (() => {
    const c = listaDeCanais.find((x) => x.id === canal);
    return c ? channelLabel(c, t) : "";
  })();
  const canalPronto = canal !== "" && (baseLegal !== "legitimate_interest" || liaRef.trim() !== "");
  const conteudoPronto = ehOficial ? modeloPronto : texto.trim() !== "";
  const lancamentoPronto = quando === "agora" || horario !== "";
  const podeSalvar = nome.trim() !== "" && canalPronto && conteudoPronto && temCriterio;
  const elegiveis = temCriterio && previa.data ? previa.data.elegiveis : null;

  const resumoDoPublico =
    [
      filtro.funis.length
        ? `${(funis.data ?? []).find((f) => f.id === funilDoPublico)?.name ?? t("Funil")}${
            etapaDoPublico
              ? ` · ${(etapasDoPublico.data ?? []).find((e) => e.id === etapaDoPublico)?.name ?? ""}`
              : ""
          }`
        : "",
      filtro.com_alguma_tag.length ? `${t("Etiqueta")}: ${filtro.com_alguma_tag.join(", ")}` : "",
      filtro.sem_interacao_ha_dias ? `${filtro.sem_interacao_ha_dias} ${t("dias sem conversar")}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || t("Escolha quem vai receber");

  const textoDaPrevia = ehOficial ? (modelo ? `${t("Modelo")}: ${modelo.name}` : "") : exemplo(texto);

  const passo = (id: PassoId) => ({
    aberto: aberto === id,
    onAlternar: () => setAberto((atual) => (atual === id ? null : id)),
  });

  function corpo() {
    return {
      name: nome.trim(),
      channel_session_id: canal,
      ...(ehOficial && modelo
        ? {
            message_mode: "template",
            provider_template_name: modelo.name,
            provider_template_language: modelo.language,
            provider_template_variables: modelo.variables,
          }
        : { message_body: texto.trim() }),
      base_legal: baseLegal,
      lia_ref: liaRef.trim() || null,
      audience_filter: filtro,
      intervalo_segundos: intervalo && !rapida ? Number(intervalo) : null,
      velocidade: rapida ? "rapida" : "gradual",
      janela_inicio_hora: janelaInicio ? Number(janelaInicio) : null,
      janela_fim_hora: janelaFim ? Number(janelaFim) : null,
      teto_diario: tetoDiario ? Number(tetoDiario) : null,
      teto_horario: tetoHorario ? Number(tetoHorario) : null,
      channel_session_ids: ehOficial ? [] : extras,
      pipeline_id: funil || null,
      stage_id: etapa || null,
      agent_id: agente || null,
    } as Parameters<typeof criar.mutateAsync>[0];
  }

  async function salvarRascunho() {
    const criada = await criar.mutateAsync(corpo());
    router.push(`/app/campaigns/${criada.id}`);
  }

  async function enviar() {
    setEnviando(true);
    let id: string | null = null;
    try {
      const criada = await criar.mutateAsync(corpo());
      id = criada.id;
      const acao = (qual: string, body: Record<string, unknown> = {}) =>
        apiClient.post(`/api/v1/campaigns/${encodeURIComponent(criada.id)}/${qual}`, body);
      await acao("preparar");
      if (quando === "horario") {
        await acao("agendar", { scheduled_at: new Date(horario).toISOString() });
      } else {
        await acao("iniciar");
      }
      router.push(`/app/campaigns/${criada.id}`);
    } catch (err) {
      showApiError(err);
      // Criou mas não terminou: o detalhe mostra em que pé ficou e o botão do
      // passo que falta. Nada sai sem a lista preparada.
      if (id) router.push(`/app/campaigns/${id}`);
    } finally {
      setEnviando(false);
    }
  }

  const ocupado = criar.isPending || enviando;

  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-card px-6 py-3">
        <label className="flex min-w-0 flex-1 items-center gap-2">
          <span className="sr-only">{t("Nome da transmissão")}</span>
          <input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="min-w-0 flex-1 truncate border-b border-transparent bg-transparent text-lg outline-none focus:border-primary"
          />
          <PencilSimple size={16} aria-hidden className="shrink-0 text-muted-foreground" />
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" onClick={() => router.push("/app/campaigns")}>
            {t("Cancelar")}
          </Button>
          <Button
            variant="outline"
            disabled={!podeSalvar || ocupado}
            onClick={() => void salvarRascunho()}
          >
            {t("Salvar rascunho")}
          </Button>
          <Button disabled={!podeSalvar || !lancamentoPronto || ocupado} onClick={() => void enviar()}>
            {enviando ? t("Enviando…") : quando === "horario" ? t("Programar") : t("Enviar agora")}
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3">
          {/* ── Destinatários ── */}
          <Passo titulo={t("Destinatários")} feito={temCriterio} resumo={resumoDoPublico} {...passo("destinatarios")}>
            <div className="space-y-2">
              <Label htmlFor="segmento">{t("Quem vai receber")}</Label>
              <select
                id="segmento"
                className={SELECT}
                value={segmento}
                onChange={(e) => setSegmento(e.target.value as Segmento)}
              >
                <option value="funil">{t("Leads de um funil")}</option>
                <option value="etiqueta">{t("Contatos com uma etiqueta")}</option>
                <option value="parados">{t("Contatos sem conversar há um tempo")}</option>
              </select>
            </div>

            {segmento === "funil" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  aria-label={t("Funil")}
                  className={SELECT}
                  value={funilDoPublico}
                  onChange={(e) => {
                    setFunilDoPublico(e.target.value);
                    setEtapaDoPublico("");
                  }}
                >
                  <option value="">{t("Escolha o funil")}</option>
                  {(funis.data ?? []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("Etapa")}
                  className={SELECT}
                  value={etapaDoPublico}
                  disabled={!funilDoPublico}
                  onChange={(e) => setEtapaDoPublico(e.target.value)}
                >
                  <option value="">{t("Todas as etapas")}</option>
                  {(etapasDoPublico.data ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {segmento === "etiqueta" && (
              <Input
                aria-label={t("Etiquetas")}
                value={comAlgumaTag}
                onChange={(e) => setComAlgumaTag(e.target.value)}
                placeholder={t("Ex.: cliente, vip (separe por vírgula)")}
              />
            )}
            {segmento === "parados" && (
              <div className="flex items-center gap-2 text-sm">
                <span>{t("Sem conversar há mais de")}</span>
                <Input
                  aria-label={t("Dias sem conversar")}
                  type="number"
                  min={1}
                  value={semInteracao}
                  onChange={(e) => setSemInteracao(e.target.value)}
                  className="w-24"
                />
                <span>{t("dias")}</span>
              </div>
            )}

            <ResultadoDaPrevia
              temCriterio={temCriterio}
              contando={previa.isPending}
              elegiveis={elegiveis}
              excluidos={previa.data?.excluidos ?? 0}
            />
            {previa.data?.truncado && (
              <p className="text-sm text-amber-600">
                {t(
                  "O recorte bateu o teto de 20.000 negócios desta prévia — a lista pode estar incompleta. Refine o filtro para ver o todo.",
                )}
              </p>
            )}

            <MaisOpcoes>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="com-tags">{t("Com alguma destas etiquetas")}</Label>
                  <Input id="com-tags" value={comAlgumaTag} onChange={(e) => setComAlgumaTag(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sem-tags">{t("Sem nenhuma destas etiquetas")}</Label>
                  <Input id="sem-tags" value={semTags} onChange={(e) => setSemTags(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="silencio">{t("Sem conversar há (dias)")}</Label>
                  <Input
                    id="silencio"
                    type="number"
                    min={1}
                    value={semInteracao}
                    onChange={(e) => setSemInteracao(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="limite">{t("Máximo de contatos")}</Label>
                  <Input
                    id="limite"
                    type="number"
                    min={1}
                    max={5000}
                    value={limite}
                    onChange={(e) => setLimite(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("Os filtros se somam: só recebe quem atende a todos.")}
              </p>
            </MaisOpcoes>
          </Passo>

          {/* ── Canal ── */}
          <Passo
            titulo={t("Canal")}
            feito={canalPronto}
            resumo={nomeDoCanal || t("Escolha o número que envia")}
            {...passo("canal")}
          >
            <select
              id="canal"
              aria-label={t("Enviar pelo número")}
              className={SELECT}
              value={canal}
              onChange={(e) => {
                setCanal(e.target.value);
                setModelo(null);
              }}
            >
              <option value="">{t("Escolha um número")}</option>
              {listaDeCanais.map((c) => (
                <option key={c.id} value={c.id}>
                  {channelLabel(c, t)}
                </option>
              ))}
            </select>
            {canais.data?.length === 0 && (
              <p className="text-sm text-warning-fg">
                {t("Nenhum número conectado. Conecte um em Conexões antes de criar a transmissão.")}
              </p>
            )}

            <MaisOpcoes>
              {!ehOficial && listaDeCanais.length > 1 && (
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">{t("Revezar também com estes números")}</legend>
                  {listaDeCanais
                    .filter((c) => c.id !== canal)
                    .map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={extras.includes(c.id)}
                          onChange={(e) =>
                            setExtras((atual) =>
                              e.target.checked ? [...atual, c.id] : atual.filter((id) => id !== c.id),
                            )
                          }
                        />
                        {channelLabel(c, t)}
                      </label>
                    ))}
                </fieldset>
              )}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("Por que estas pessoas recebem")}</legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="base-legal"
                    checked={baseLegal === "consent"}
                    onChange={() => setBaseLegal("consent")}
                  />
                  {t("Elas pediram para receber (consentimento)")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="base-legal"
                    checked={baseLegal === "legitimate_interest"}
                    onChange={() => setBaseLegal("legitimate_interest")}
                  />
                  {t("Interesse legítimo, com avaliação (LIA) registrada")}
                </label>
                {baseLegal === "legitimate_interest" && (
                  <Input
                    aria-label={t("Referência da avaliação (LIA)")}
                    value={liaRef}
                    onChange={(e) => setLiaRef(e.target.value)}
                    placeholder={t("Ex.: LIA-2026-01")}
                  />
                )}
              </fieldset>
            </MaisOpcoes>
          </Passo>

          {/* ── Conteúdo ── */}
          <Passo
            titulo={t("Conteúdo")}
            feito={conteudoPronto}
            resumo={conteudoPronto ? textoDaPrevia : t("Adicione seu conteúdo")}
            {...passo("conteudo")}
          >
            {ehOficial ? (
              <ModeloDaCampanha
                channelSessionId={canal}
                provider={providerDoCanal}
                valor={modelo}
                onChange={setModelo}
              />
            ) : (
              <>
                <Textarea
                  rows={6}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={t("Escreva como você falaria com uma pessoa só.")}
                  aria-label={t("Texto da mensagem")}
                />
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">{t("Inserir:")}</span>
                  {VARIAVEIS_DA_CAMPANHA.map((v) => (
                    <button
                      key={v}
                      type="button"
                      title={t(DESCRICAO_DA_VARIAVEL[v])}
                      className="rounded-full border border-border bg-card px-2 py-0.5 hover:border-accent hover:text-accent"
                      onClick={() => setTexto((atual) => `${atual}{{${v}}}`)}
                    >
                      {v.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Passo>

          {/* ── Lançamento ── */}
          <Passo
            titulo={t("Lançamento")}
            feito={lancamentoPronto}
            resumo={
              quando === "agora"
                ? t("Imediatamente")
                : horario
                  ? new Date(horario).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                  : t("Escolha o horário")
            }
            {...passo("lancamento")}
          >
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="quando" checked={quando === "agora"} onChange={() => setQuando("agora")} />
              {t("Imediatamente")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="quando"
                checked={quando === "horario"}
                onChange={() => setQuando("horario")}
              />
              {t("Escolher data e horário")}
            </label>
            {quando === "horario" && (
              <Input
                type="datetime-local"
                aria-label={t("Data e horário do envio")}
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-64"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {t("As mensagens saem aos poucos, no ritmo seguro do número, para não arriscar bloqueio.")}
            </p>

            <MaisOpcoes>
              {canal && <VelocidadeDaCampanha valor={velocidade} onChange={setVelocidade} ehOficial={ehOficial} />}
              <div className="grid gap-3 sm:grid-cols-2">
                {!rapida && (
                  <div className="space-y-1">
                    <Label htmlFor="intervalo">{t("Intervalo entre mensagens (segundos)")}</Label>
                    <Input id="intervalo" type="number" min={1} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="teto">{t("Máximo por dia")}</Label>
                  <Input id="teto" type="number" min={1} value={tetoDiario} onChange={(e) => setTetoDiario(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="teto-hora">{t("Máximo por hora")}</Label>
                  <Input id="teto-hora" type="number" min={1} value={tetoHorario} onChange={(e) => setTetoHorario(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="janela-inicio">{t("Enviar a partir das (hora)")}</Label>
                  <Input id="janela-inicio" type="number" min={0} max={23} value={janelaInicio} onChange={(e) => setJanelaInicio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="janela-fim">{t("Parar às (hora)")}</Label>
                  <Input id="janela-fim" type="number" min={1} max={24} value={janelaFim} onChange={(e) => setJanelaFim(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="funil">{t("Resposta vira lead no funil")}</Label>
                  <select
                    id="funil"
                    className={SELECT}
                    value={funil}
                    onChange={(e) => {
                      setFunil(e.target.value);
                      setEtapa("");
                    }}
                  >
                    <option value="">{t("Funil do número")}</option>
                    {(funis.data ?? []).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="etapa">{t("Na etapa")}</Label>
                  <select id="etapa" className={SELECT} value={etapa} disabled={!funil} onChange={(e) => setEtapa(e.target.value)}>
                    <option value="">{t("Primeira etapa")}</option>
                    {(etapas.data ?? [])
                      .filter((e) => !e.is_won && !e.is_lost)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="agente">{t("Quem atende a resposta")}</Label>
                  <select id="agente" className={SELECT} value={agente} onChange={(e) => setAgente(e.target.value)}>
                    <option value="">{t("Agente do número")}</option>
                    {(agentes.data ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </MaisOpcoes>
          </Passo>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-1.5 text-sm">
            <p className="font-medium">{t("Sua transmissão")}</p>
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("Destinatários")}:</span>
              <span className="font-medium">{elegiveis ?? "—"}</span>
            </p>
            <p className="flex justify-between gap-2">
              <span className="text-muted-foreground">{t("Mensagens a serem enviadas")}:</span>
              <span className="font-medium">{elegiveis ?? "—"}</span>
            </p>
          </div>
          <PreviaNoCelular texto={textoDaPrevia} />
        </aside>
      </div>
    </div>
  );
}

function ResultadoDaPrevia({
  temCriterio,
  contando,
  elegiveis,
  excluidos,
}: {
  temCriterio: boolean;
  contando: boolean;
  elegiveis: number | null;
  excluidos: number;
}) {
  const t = useT();
  if (!temCriterio) return null;
  return (
    <p className="rounded-md bg-accent-soft px-3 py-2 text-sm">
      {contando || elegiveis === null ? (
        t("Contando…")
      ) : (
        <>
          <strong>{elegiveis}</strong> {t("pessoas vão receber")}
          {excluidos > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {excluidos} {t("ficam de fora (sem número, bloqueadas ou sem o dado da mensagem)")}
            </span>
          )}
        </>
      )}
    </p>
  );
}

function MaisOpcoes({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <details className="group rounded-md border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
        <Plus size={12} aria-hidden className="transition-transform group-open:rotate-45" />
        {t("Mais opções")}
      </summary>
      <div className="space-y-4 border-t border-border p-3">{children}</div>
    </details>
  );
}

/** Um passo: fechado mostra só o resumo; aberto, os campos. */
function Passo({
  titulo,
  resumo,
  feito,
  aberto,
  onAlternar,
  children,
}: {
  titulo: string;
  resumo: string;
  feito: boolean;
  aberto: boolean;
  onAlternar: () => void;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-lg border bg-card", aberto ? "border-primary" : "border-border")}>
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={aberto}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <CheckCircle
          size={22}
          weight="fill"
          aria-hidden
          className={cn("shrink-0", feito ? "text-emerald-500" : "text-muted-foreground/40")}
        />
        <span className="w-28 shrink-0 font-medium">{titulo}</span>
        {!aberto && <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{resumo}</span>}
        {aberto ? (
          <CaretDown size={16} aria-hidden className="ml-auto shrink-0" />
        ) : (
          <CaretRight size={16} aria-hidden className="ml-auto shrink-0" />
        )}
      </button>
      {aberto && <div className="space-y-4 px-4 pb-5 sm:pl-[3.25rem]">{children}</div>}
    </section>
  );
}

/** Como a mensagem chega no WhatsApp de quem recebe. */
function PreviaNoCelular({ texto }: { texto: string }) {
  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      aria-hidden
      className="mx-auto w-full max-w-[280px] rounded-[2.25rem] border-[6px] border-neutral-200 bg-white p-1 shadow-sm"
    >
      <div className="flex items-center justify-between px-4 pt-2 text-[11px] font-semibold">
        <span>{hora}</span>
        <span className="h-4 w-16 rounded-full bg-neutral-200" />
        <span>●●●</span>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-sky-600">
        <CaretLeft size={16} />
        <span className="flex gap-3">
          <VideoCamera size={16} />
          <Phone size={16} />
        </span>
      </div>
      <div className="flex h-[380px] flex-col justify-start overflow-y-auto bg-[#ece5dd] p-3">
        {texto ? (
          <p className="max-w-[90%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug whitespace-pre-wrap text-neutral-800 shadow-sm">
            {texto}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-sky-600">
        <Plus size={16} />
        <span className="h-6 flex-1 rounded-full border border-neutral-200" />
        <Microphone size={16} />
      </div>
      <div className="mx-auto mb-1 h-1 w-24 rounded-full bg-neutral-300" />
    </div>
  );
}

/** Troca as variáveis por um exemplo, para a prévia ler como mensagem de verdade. */
function exemplo(texto: string): string {
  return texto.replace(/\{\{\s*([a-z_]+)(?:\|"([^"]*)")?\s*\}\}/g, (_m, v: string, reserva?: string) => {
    const amostra: Record<string, string> = { primeiro_nome: "Maria", nome: "Maria Souza" };
    return amostra[v] ?? reserva ?? `[${v}]`;
  });
}

function listar(bruto: string): string[] {
  return bruto
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
