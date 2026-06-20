// src/app/[locale]/privacy/page.tsx
import { Footer } from "@/app/(components)/footer";
import { Navbar } from "@/app/(components)/nav-bar";
import { getServerTranslation } from "@/lib/utils/server-translation";
import Link from "next/link";

export default async function PrivacyPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const { t } = await getServerTranslation(locale);

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-500">
      <Navbar />

      <main className="flex-grow pt-28 md:pt-36 pb-24 px-6 w-full max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-60 hover:text-foreground transition-colors py-2"
          >
            {t("publicHelp.back_to_landing")}
          </Link>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-heading text-foreground mb-4">
          {t("privacy.title")}
        </h1>
        <p className="text-sm font-semibold text-foreground-40 uppercase tracking-wider mb-12">
          {t("privacy.last_updated")}
        </p>

        <div className="flex flex-col gap-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
            <section key={num}>
              <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
                {t(`privacy.h${num}`)}
              </h2>
              <p className="text-base leading-relaxed font-sans text-foreground-67">
                {t(`privacy.p${num}`)}
              </p>
            </section>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
