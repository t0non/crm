import localFont from "next/font/local";

/** PT Sans: tipografia da área interna da referência, servida pelo próprio app. */
export const fonteCrm = localFont({
  src: [
    { path: "../../public/fonts/pt-sans/regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/pt-sans/bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-crm",
});
