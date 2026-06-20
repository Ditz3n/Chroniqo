// src/app/[locale]/(protected)/search/page.tsx
import { SearchResultsView } from "./(components)/search-results-view";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    scope?: string;
    section?: string;
  }>;
}) {
  const { locale } = await params;
  const { q = "", type = "global", scope, section } = await searchParams;

  const safeType = type === "community" || type === "user" ? type : "global";

  const safeSection =
    section === "users" || section === "communities" || section === "posts"
      ? section
      : undefined;

  return (
    <div className="flex w-full min-h-full py-6 justify-center">
      <div className="flex flex-col w-full max-w-[760px] px-4 sm:px-6 mx-auto">
        <SearchResultsView
          query={q}
          type={safeType}
          scope={scope}
          section={safeSection}
          locale={locale}
        />
      </div>
    </div>
  );
}
