import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";
import TimerProvider from "@/components/TimerProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  variable: "--font-game",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Super Mario Kanban Board",
  description: "Advanced Kanban Board with Live Timer & Mario Aesthetics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${pressStart2P.variable}`}>
      <body suppressHydrationWarning>
        <TimerProvider>
          {children}
        </TimerProvider>
      </body>
    </html>
  );
}
