import type { Metadata } from "next";
import { Golos_Text, Wix_Madefor_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const display = Wix_Madefor_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const SITE_TITLE = "MANTAEV CAPITAL агентство недвижимости";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_TITLE,
  openGraph: {
    title: SITE_TITLE,
    description: SITE_TITLE,
    type: "website",
    siteName: SITE_TITLE,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_TITLE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${golos.variable} ${display.variable} ${golos.className} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster richColors position="top-right" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
