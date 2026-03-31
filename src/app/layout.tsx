import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blackjack Live - Canlı Multiplayer Blackjack",
  description: "6 kişiye kadar canlı blackjack oyna, turnuvalara katıl ve büyük ödüller kazan!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
