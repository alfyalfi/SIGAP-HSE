import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./globals-admin.css";
import { getSiteUrl } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-jakarta" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "SIGAP HSE",
    template: "%s | SIGAP HSE",
  },
  description:
    "Sistem Informasi Guna Audit dan Penyelesaian - pelaporan dan tindak lanjut temuan HSE.",
  applicationName: "SIGAP HSE",
  keywords: ["SIGAP HSE", "HSE", "K3", "temuan", "pelaporan", "tindak lanjut", "audit", "safety"],
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "SIGAP HSE",
    title: "SIGAP HSE",
    description:
      "Sistem informasi untuk pelaporan, review, dan penyelesaian temuan HSE dalam satu alur yang rapi.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SIGAP HSE",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGAP HSE",
    description:
      "Sistem informasi untuk pelaporan, review, dan penyelesaian temuan HSE dalam satu alur yang rapi.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('sigap:theme');
                  if (theme) document.documentElement.dataset.theme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${jakarta.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
