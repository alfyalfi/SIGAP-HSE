import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./globals-admin.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-jakarta" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "SIGAP HSE",
    template: "%s | SIGAP HSE",
  },
  description:
    "Sistem Informasi Guna Audit dan Penyelesaian — pelaporan dan tindak lanjut temuan HSE.",
  applicationName: "SIGAP HSE",
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
