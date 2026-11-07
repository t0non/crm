import localFont from "next/font/local";
export const fonteEuclid = localFont({
  src: [
    { path: "../../public/landing-reference/euclid-regular.woff2", weight: "400", style: "normal" },
    {
      path: "../../public/landing-reference/euclid-medium.woff2",
      weight: "500 600",
      style: "normal",
    },
    {
      path: "../../public/landing-reference/euclid-bold.woff2",
      weight: "700 900",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-landing-euclid",
});
