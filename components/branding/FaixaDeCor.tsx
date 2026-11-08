/**
 * A faixa de cor do pé da página (azul, roxo e verde deslizando juntos, em duas
 * camadas com ritmos diferentes). É a assinatura visual das telas de fora do
 * sistema: entrar, cadastrar, recuperar senha, ativar a conta. Na tela de ativar
 * conta, quando o pagamento cai (`<html data-pagamento="confirmado">`), a faixa
 * dá lugar ao verde pulsando.
 *
 * Fica FIXA no rodapé e atrás de tudo (`pointer-events-none`); quem usa só
 * precisa pôr o conteúdo num contêiner com `relative z-10`.
 */
export function FaixaDeCor() {
  return (
    <>
      <style>{`
        @keyframes coral-desliza { 0% { background-position:0% 50%; } 100% { background-position:100% 50%; } }
        @keyframes coral-respira { 0%,100% { transform:scaleY(1); } 50% { transform:scaleY(1.08); } }
        [data-aurora] { transition: opacity 1.2s ease; -webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.8) 22%, rgba(0,0,0,.45) 48%, rgba(0,0,0,.15) 72%, transparent 100%); mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,.8) 22%, rgba(0,0,0,.45) 48%, rgba(0,0,0,.15) 72%, transparent 100%); }
        [data-aurora] > span { position:absolute; inset:0; transform-origin:bottom; filter: blur(80px) saturate(.9); will-change: background-position, transform; }
        [data-neon-verde] { opacity:0; transition: opacity 1.2s ease; filter: blur(70px); }
        html[data-pagamento="confirmado"] [data-aurora] { opacity:0; }
        html[data-pagamento="confirmado"] [data-neon-verde] { opacity:1; }
        html[data-pagamento="confirmado"] [data-neon-verde] > div { animation: verde-respira 1.6s ease-in-out infinite; }
        @keyframes verde-respira { 0%,100% { opacity:.7; transform:translateX(-50%) scale(1); } 50% { opacity:1; transform:translateX(-50%) scale(1.1); } }
        @media (prefers-reduced-motion: reduce) { [data-aurora] > span, [data-neon-verde] > div { animation:none !important; } }
      `}</style>
      {/* Faixa de cor no pé da página: azul, roxo e verde deslizando juntos, em duas camadas com
          ritmos diferentes (a mistura nunca se repete). Quando o pagamento cai, tudo vira verde. */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 bottom-0 h-[60vh] overflow-hidden">
        <div data-aurora="" className="absolute -inset-x-20 -bottom-10 h-[42vh]">
          <span
            style={{
              background: "linear-gradient(90deg,#2563eb,#8b5cf6,#10b981,#38bdf8,#7c3aed,#2563eb,#14b8a6,#2563eb)",
              backgroundSize: "400% 100%",
              animation: "coral-desliza 16s ease-in-out infinite alternate, coral-respira 7s ease-in-out infinite",
              opacity: 0.42,
            }}
          />
          <span
            style={{
              background: "linear-gradient(90deg,#10b981,#2563eb,#a855f7,#22d3ee,#2563eb,#10b981)",
              backgroundSize: "300% 100%",
              animation: "coral-desliza 11s ease-in-out infinite alternate-reverse, coral-respira 9s ease-in-out infinite reverse",
              opacity: 0.28,
            }}
          />
        </div>
        <div data-neon-verde="" className="absolute inset-0">
          <div style={{ transform: "translateX(-50%)" }} className="absolute -bottom-40 left-1/2 h-[30rem] w-[140%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,.85),rgba(16,185,129,.3)_45%,transparent_70%)]" />
        </div>
      </div>
    </>
  );
}
