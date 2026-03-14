import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RecipeMatch — Cook What You Have",
  description:
    "Discover recipes using ingredients you already have at home. RecipeMatch matches ingredients to recipes instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body suppressHydrationWarning className="antialiased font-nunito">
        {children}
      </body>
    </html>
  );
}
