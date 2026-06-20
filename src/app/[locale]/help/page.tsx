// src/app/[locale]/help/page.tsx
import { Footer } from "@/app/(components)/footer";
import { Navbar } from "@/app/(components)/nav-bar";
import { getServerTranslation } from "@/lib/utils/server-translation";
import Link from "next/link";

export default async function PublicHelpPage(props: {
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
          {t("publicHelp.title")}
        </h1>
        <p className="text-lg text-foreground-67 leading-relaxed mb-12 max-w-2xl">
          {t("publicHelp.subtitle")}
        </p>

        <div className="flex flex-col gap-10">
          <section>
            <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
              {t("publicHelp.sign_in_title")}
            </h2>
            <p className="text-base leading-relaxed font-sans text-foreground-67">
              {t("publicHelp.sign_in_desc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
              {t("publicHelp.signup_title")}
            </h2>
            <p className="text-base leading-relaxed font-sans text-foreground-67">
              {t("publicHelp.signup_desc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
              {t("publicHelp.email_title")}
            </h2>
            <p className="text-base leading-relaxed font-sans text-foreground-67">
              {t("publicHelp.email_desc")}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
              {t("publicHelp.trouble_title")}
            </h2>
            <ul className="space-y-3 text-base leading-relaxed font-sans text-foreground-67">
              <li>{t("publicHelp.trouble_1")}</li>
              <li>{t("publicHelp.trouble_2")}</li>
              <li>{t("publicHelp.trouble_3")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold font-heading text-foreground mb-3">
              {t("publicHelp.contact_title")}
            </h2>
            <p className="text-base leading-relaxed font-sans text-foreground-67">
              {t("publicHelp.contact_desc")}
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
