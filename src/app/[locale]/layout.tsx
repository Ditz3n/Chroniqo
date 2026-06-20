// src/app/[locale]/layout.tsx
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/context/session-provider";
import { ThemeProvider } from "@/context/theme-context";
import { TranslationProvider } from "@/context/translation-context";
import type { Metadata } from "next";
import { Inter, Poppins, Syne } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["800"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chroniqo",
  description: "Et digitalt frirum for kronisk syge. Bygget med omsorg.",
};

// A blocking script that prevents Flash of Unstyled Content (FOUC)
// This is the recommended approach for theme initialization in Next.js
// to ensure the correct theme is applied on the first paint.
// This is also what libraries like next-themes do under the hood.
const themeScript = `
  (function() {
    try {
      var storedTheme = localStorage.getItem('theme-preference');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (storedTheme === 'dark' || (storedTheme === 'system' && prefersDark) || (!storedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

// Applies the saved mood brand color before first paint - prevents flash of default rose color.
// Mirrors the themeScript pattern. Stored value is only valid for today's date.
const moodScript = `
  (function() {
    try {
      var stored = JSON.parse(localStorage.getItem('chroniqo-mood') || 'null');
      var today = new Date().toLocaleDateString('en-CA');
      var colors = ['#A591F5','#EB7D19','#915F46','#FFCD5A','#9BAF64'];
      if (stored && stored.date === today && stored.value >= 0 && stored.value <= 4) {
        document.documentElement.style.setProperty('--brand', colors[stored.value]);
      }
    } catch(e) {}
  })();
`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Await params since Next.js 15+ dynamic route params are Promises
  const { locale } = await params;

  // Protect against unsupported locales
  if (locale !== "da" && locale !== "en") {
    notFound();
  }

  // Dynamically load the correct JSON dictionary on the server
  const dictionary = await import(`@/messages/${locale}.json`).then(
    (module) => module.default,
  );

  return (
    // suppressHydrationWarning is required here because the inline script
    // mutates the class attribute on the client before React hydrates.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: moodScript }} />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${syne.variable} antialiased`}
      >
        <SessionProvider>
          <ThemeProvider>
            <TranslationProvider dictionary={dictionary} locale={locale}>
              <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            </TranslationProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
