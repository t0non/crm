"use client";

/* Referência visual solicitada: https://www.kommo.com/br/.
 * Preserva a marca, a oferta e os destinos comerciais da instalação. */
/* eslint-disable @next/next/no-img-element -- Imagens locais com proporção original. */
import { useState, type MouseEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LoginForm } from "@/components/auth/LoginForm";
import { EntrarComGoogle } from "@/components/auth/EntrarComGoogle";
import Link from "next/link";
import { fonteEuclid as euclid } from "@/lib/ui/fonte-euclid";
import {
  ArrowRight,
  ChartPie,
  Check,
  ChevronDown,
  Globe,
  Menu,
  MessageCircle,
  Settings2,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { CAMINHO_CADASTRO_COMERCIAL } from "@/lib/cobranca/jornada";
import { PRECO_PROFISSIONAL_CENTS } from "@/lib/cobranca/oferta-profissional";
import s from "./landing-page.module.css";

const CAMINHO_LOGIN_CRM = "/login?next=%2Fapp%2Finbox";
const demos = [
  { title: "Capture", image: "capture", icon: Users },
  { title: "Automatize", image: "automate", icon: Settings2 },
  { title: "Escale", image: "scale", icon: TrendingUp },
  { title: "Analise", image: "analyze", icon: ChartPie },
];
const features = [
  {
    title: "Resposta com IA",
    image: "inbox",
    text: "Reúna mensagens e histórico em uma caixa de entrada. Sua equipe acompanha cada conversa com o contexto que precisa para atender.",
    color: "#edeaff",
  },
  {
    title: "Mova leads com IA",
    image: "pipeline",
    text: "Organize suas oportunidades em etapas claras. Acompanhe responsáveis, atividades e o próximo passo de cada negociação.",
    color: "#e7f3ff",
  },
  {
    title: "Agende com IA",
    image: "calendar",
    text: "Tenha compromissos e disponibilidade à mão. Conecte o atendimento à agenda para dar continuidade à conversa.",
    color: "#fff3d8",
  },
  {
    title: "Venda mais com IA",
    image: "analytics",
    text: "Veja o andamento da operação e encontre oportunidades para melhorar o atendimento e a conversão.",
    color: "#e8f7ed",
  },
];
const questions = [
  [
    "Como começo a usar?",
    "Crie sua conta, confirme seu e-mail e revise o plano. Após a confirmação do pagamento, configure sua empresa e conecte o atendimento.",
  ],
  [
    "Posso usar minha própria marca?",
    "Sim. O nome, a identidade visual e as configurações da sua instalação são mantidos no CRM.",
  ],
  [
    "Como funcionam os agentes de IA?",
    "Você configura o provedor, as credenciais, as instruções e as ferramentas do agente dentro do CRM. A equipe pode assumir a conversa quando necessário.",
  ],
  [
    "Onde consulto o preço?",
    "O valor atual está no plano abaixo. Antes de pagar, você revisa as condições e pode aplicar seu cupom.",
  ],
];
const aiItems = [
  [
    "Atenda com mais contexto",
    "Use as instruções e a base de conhecimento da sua empresa para orientar as respostas do agente.",
  ],
  [
    "Mantenha o próximo passo à vista",
    "Organize atividades e acompanhe as oportunidades que precisam de retorno.",
  ],
  [
    "Trabalhe junto com a equipe",
    "O atendimento humano continua com acesso ao histórico da conversa.",
  ],
  [
    "Acompanhe sua operação",
    "Consulte os resultados e ajuste suas configurações a partir do que acontece no atendimento.",
  ],
];

export function LandingPage({ nome }: { nome: string }) {
  const [loginOpen, setLoginOpen] = useState(false);
  const abrirLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMobileOpen(false);
    setLoginOpen(true);
  };
  const [demo, setDemo] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notice, setNotice] = useState(true);
  const selected = demos[demo] ?? demos[0]!;
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(PRECO_PROFISSIONAL_CENTS / 100);
  const signup = (
    <Link className={s.gradientButton} href={CAMINHO_CADASTRO_COMERCIAL}>
      Começar agora <Sparkles size={20} aria-hidden="true" />
    </Link>
  );

  return (
    <div className={`${s.page} ${euclid.variable}`}>
      <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={s.authOverlay} />
          <Dialog.Content
            className={`${s.page} ${s.authScreen} ${euclid.variable}`}
            aria-describedby={undefined}
          >
            <header className={s.authHeader}>
              <div>
                <button
                  type="button"
                  className={s.logo}
                  onClick={() => setLoginOpen(false)}
                  aria-label="Voltar para o site"
                >
                  {nome}
                </button>
                <div>
                  <Link href={CAMINHO_CADASTRO_COMERCIAL} className={s.register}>
                    Registre-se
                  </Link>
                  <Dialog.Close className={s.authClose} aria-label="Fechar login">
                    <X size={26} />
                  </Dialog.Close>
                </div>
              </div>
            </header>
            <div className={s.authBody}>
              <div className={s.authForm}>
                <Dialog.Title className={s.authTitle}>Faça login</Dialog.Title>
                <LoginForm next="/app/inbox" apresentacao="landing" />
                <div className={s.authGoogle}>
                  <EntrarComGoogle next="/app/inbox" />
                </div>
                <Link className={s.authForgot} href="/login/forgot">
                  Esqueceu a senha?
                </Link>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <header className={s.header}>
        <div className={s.navbar}>
          <Link className={s.logo} href="/" aria-label={`${nome} — início`}>
            {nome}
          </Link>
          <nav className={s.desktopNav} aria-label="Navegação principal">
            {(
              [
                [
                  "Produto",
                  ["Plataforma de CRM", "#recursos"],
                  ["Veja como funciona", "#demonstracao"],
                  ["Agentes de IA", "#inteligencia"],
                ],
                [
                  "Recursos",
                  ["Caixa de entrada", "#recursos"],
                  ["Funil de vendas", "#recursos"],
                  ["Perguntas frequentes", "#perguntas"],
                ],
                [
                  "Segmentos",
                  ["Serviços e agências", "#segmentos"],
                  ["Clínicas e consultórios", "#segmentos"],
                  ["Imobiliárias e lojas", "#segmentos"],
                ],
              ] as const
            ).map(([title, ...links]) => (
              <details className={s.dropdown} key={String(title)}>
                <summary>
                  {title} <ChevronDown size={13} />
                </summary>
                <div>
                  {links.map((link) => (
                    <a key={link[0]} href={link[1]}>
                      {link[0]}
                    </a>
                  ))}
                </div>
              </details>
            ))}
            <a href="#plano">Preços</a>
          </nav>
          <div className={s.navActions}>
            <a
              href="#perguntas"
              className={s.language}
              aria-label="Conteúdo em português brasileiro"
            >
              <Globe size={18} />
            </a>
            <a href="#plano" className={s.sales}>
              Fale com vendas
            </a>
            <Link className={s.login} href={CAMINHO_LOGIN_CRM} onClick={abrirLogin}>
              Iniciar sessão
            </Link>
            <Link className={s.register} href={CAMINHO_CADASTRO_COMERCIAL}>
              Registre-se
            </Link>
          </div>
          <button
            type="button"
            className={s.menuButton}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <nav id="landing-mobile-menu" className={s.mobileNav} aria-label="Navegação móvel">
            <a onClick={() => setMobileOpen(false)} href="#recursos">
              Produto
            </a>
            <a onClick={() => setMobileOpen(false)} href="#inteligencia">
              Inteligência artificial
            </a>
            <a onClick={() => setMobileOpen(false)} href="#plano">
              Preços
            </a>
            <Link href={CAMINHO_LOGIN_CRM} onClick={abrirLogin}>
              Iniciar sessão
            </Link>
            <Link href={CAMINHO_CADASTRO_COMERCIAL}>Registre-se</Link>
          </nav>
        )}
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.channelCarousel} aria-label="Conversas em diferentes canais">
            {["facebook", "tiktok", "telegram", "whatsapp", "instagram"].map((channel, i) => (
              <img
                key={channel}
                className={s[`channel${i}`]}
                src={`/landing-reference/${channel}.png`}
                alt={channel}
                width={56}
                height={56}
              />
            ))}
          </div>
          <h1>
            Escale conversas, evite o<br className={s.desktopBreak} /> caos
          </h1>
          <p className={s.heroDescription}>
            CRM com IA para automatizar conversas, agendamentos e<br className={s.desktopBreak} />{" "}
            fluxos de trabalho no WhatsApp, TikTok e Instagram.
          </p>
          {signup}
          <div className={s.badges}>
            <span className={s.brandBadge}>
              ∞ <span>Conversas conectadas</span>
            </span>
            <span className={s.rating}>
              <Sparkles size={26} />
              <span>
                IA + CRM
                <br />
                <small>EM UM SÓ LUGAR</small>
              </span>
            </span>
          </div>
          <div id="demonstracao" className={s.demo}>
            <div className={s.tabs} role="tablist" aria-label="Demonstrações do produto">
              {demos.map(({ title, icon: Icon }, index) => (
                <button
                  id={`demo-tab-${index}`}
                  key={title}
                  type="button"
                  role="tab"
                  aria-selected={demo === index}
                  aria-controls="demo-panel"
                  tabIndex={demo === index ? 0 : -1}
                  className={demo === index ? s.activeTab : undefined}
                  onClick={() => setDemo(index)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === "ArrowRight"
                        ? (demo + 1) % demos.length
                        : event.key === "ArrowLeft"
                          ? (demo + demos.length - 1) % demos.length
                          : event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? demos.length - 1
                              : null;
                    if (next !== null) {
                      event.preventDefault();
                      setDemo(next);
                      document.getElementById(`demo-tab-${next}`)?.focus();
                    }
                  }}
                >
                  <Icon size={21} aria-hidden="true" />
                  {title}
                </button>
              ))}
            </div>
            <div
              id="demo-panel"
              role="tabpanel"
              aria-labelledby={`demo-tab-${demo}`}
              className={s.demoPanel}
            >
              <img
                key={selected.image}
                src={`/landing-reference/${selected.image}.png`}
                alt={`Demonstração visual: ${selected.title}`}
                width={1200}
                height={760}
              />
              <span className={s.exampleLabel}>Demonstração visual da referência</span>
            </div>
          </div>
          <div className={s.orbitOne} aria-hidden="true">
            <MessageCircle />
          </div>
          <div className={s.orbitTwo} aria-hidden="true">
            <Sparkles />
          </div>
        </section>
        <section id="segmentos" className={s.segments}>
          <p>Mais organização para negócios que crescem com conversas</p>
          <div>
            {["Serviços", "Imobiliárias", "Educação", "Clínicas", "E-commerce"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <a href="#recursos">
            Conheça as possibilidades <ArrowRight size={17} />
          </a>
        </section>
        <section id="recursos" className={s.features}>
          <h2>
            Opere o seu <span className={s.headingSpark}>✦</span>
            <br /> negócio em um único lugar
          </h2>
          <div className={s.featureGrid}>
            {features.map((feature) => (
              <article key={feature.title} className={s.featureCard}>
                <div className={s.featureCopy}>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <a href="#plano">
                    Saiba mais <ArrowRight size={17} />
                  </a>
                </div>
                <div className={s.featureImage} style={{ background: feature.color }}>
                  <img
                    src={`/landing-reference/${feature.image}.png`}
                    alt={`Demonstração visual: ${feature.title}`}
                    width={720}
                    height={520}
                    loading="lazy"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="inteligencia" className={s.aiSection}>
          <h2>
            Escolha seu próximo passo.
            <br />
            <span>Deixe a IA ajudar a escalar</span>
          </h2>
          <div className={s.aiCard}>
            <div className={s.aiCopy}>
              <span className={s.eyebrow}>
                <Sparkles size={19} /> Inteligência artificial
              </span>
              <h3>O colega de IA que a equipe de vendas merece</h3>
              {signup}
              <div className={s.accordions}>
                {aiItems.map(([title, text], index) => (
                  <details key={title} open={index === 0}>
                    <summary>
                      <Sparkles size={17} />
                      {title}
                      <ChevronDown size={18} />
                    </summary>
                    <p>{text}</p>
                  </details>
                ))}
              </div>
            </div>
            <div className={s.aiImage}>
              <img
                src="/landing-reference/ai.png"
                width={850}
                height={950}
                alt="Demonstração de agente de IA conduzindo uma conversa"
                loading="lazy"
              />
            </div>
          </div>
        </section>
        <section className={s.workflow}>
          <h2>
            Da primeira mensagem
            <br />
            ao próximo negócio
          </h2>
          <div className={s.workflowGrid}>
            {[
              ["01", "Conecte", "Traga suas conversas para o CRM e organize os contatos."],
              ["02", "Acompanhe", "Visualize o funil, as atividades e o histórico do atendimento."],
              [
                "03",
                "Cresça",
                "Combine agentes de IA e sua equipe para continuar cada oportunidade.",
              ],
            ].map(([n, title, text]) => (
              <article key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="plano" className={s.pricing}>
          <h2>
            Sua equipe de vendas
            <br />
            está pronta para o próximo nível <Sparkles />
          </h2>
          <p className={s.pricingIntro}>Uma operação conectada. Um plano para começar.</p>
          <article className={s.priceCard}>
            <div>
              <span className={s.pill}>Plano disponível</span>
              <h3>Profissional</h3>
              <p>Conversas, oportunidades e atendimento em um só lugar.</p>
              <ul>
                {[
                  "Caixa de entrada e histórico dos contatos",
                  "Funil de vendas e atividades",
                  "Configuração de agentes de IA",
                  "Atendimento com continuidade humana",
                ].map((item) => (
                  <li key={item}>
                    <Check size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={s.priceRight}>
              <p className={s.price}>
                {price}
                <small>/mês</small>
              </p>
              <p>Revise as condições e aplique seu cupom antes de pagar.</p>
              {signup}
              <Link href={CAMINHO_LOGIN_CRM} onClick={abrirLogin}>
                Já tenho conta <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>
        <section id="perguntas" className={s.faq}>
          <h2>Vamos tirar suas dúvidas</h2>
          <div>
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={s.finalCta}>
          <span aria-hidden="true">✦</span>
          <h2>
            Comece a fechar mais vendas
            <br />
            com automação de IA
          </h2>
          <p>Conecte suas conversas, organize seu funil e dê o próximo passo.</p>
          <div>
            {signup}
            <a className={s.outlineButton} href="#plano">
              Conheça o plano <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>
      <footer className={s.footer}>
        <div className={s.footerTop}>
          <Link className={s.logo} href="/">
            {nome}
          </Link>
          <div>
            <h3>Produto</h3>
            <a href="#recursos">Plataforma de CRM</a>
            <a href="#demonstracao">Demonstração</a>
            <a href="#inteligencia">Inteligência artificial</a>
          </div>
          <div>
            <h3>Comece agora</h3>
            <a href="#plano">Preços</a>
            <Link href={CAMINHO_CADASTRO_COMERCIAL}>Criar conta</Link>
            <Link href={CAMINHO_LOGIN_CRM} onClick={abrirLogin}>
              Iniciar sessão
            </Link>
          </div>
          <div>
            <h3>Informações</h3>
            <a href="#perguntas">Perguntas frequentes</a>
            <Link href="/legal/privacy#dados-do-google">Política de privacidade</Link>
            <Link href="/legal/terms">Termos de uso</Link>
          </div>
        </div>
        <div className={s.footerBottom}>
          <span>
            <Globe size={16} /> Português (BR)
          </span>
          <p>
            © {new Date().getFullYear()} {nome}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
      {notice && (
        <aside className={s.notice}>
          <a href="#plano">📣 Confira o plano e as condições para começar</a>
          <button type="button" aria-label="Fechar aviso" onClick={() => setNotice(false)}>
            <X size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}
