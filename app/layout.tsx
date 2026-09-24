import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JFSI — Jardin des Frères et Sœurs en Islam",
  description: "La communauté JFSI : actualités, solidarité, rencontres et espace membres. Unis par l’islam et pour l’islam.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased"><a className="skip-link" href="#contenu">Aller au contenu</a>{children}</body>
    </html>
  );
}
