import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "./globals-admin.css";
import { getSiteUrl } from "@/lib/env";
import { InstallAppPrompt } from "@/components/InstallAppPrompt";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-jakarta" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "SIGAP",
    template: "%s | SIGAP",
  },
  description:
    "Sistem Informasi Guna Analisa dan Pelaporan - pelaporan dan tindak lanjut temuan EHS.",
  applicationName: "SIGAP",
  keywords: ["SIGAP", "EHS", "K3", "temuan", "pelaporan", "tindak lanjut", "analisa", "safety"],
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "SIGAP",
    title: "SIGAP",
    description:
      "Sistem informasi untuk pelaporan, review, dan penyelesaian temuan EHS dalam satu alur yang rapi.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SIGAP",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SIGAP",
    description:
      "Sistem informasi untuk pelaporan, review, dan penyelesaian temuan EHS dalam satu alur yang rapi.",
    images: ["/twitter-image"],
  },
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SIGAP",
    statusBarStyle: "default",
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
        <InstallAppPrompt />
      </body>
    </html>
  );
}
