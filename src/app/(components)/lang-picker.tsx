// src/app/(components)/lang-picker.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/lib/hooks/use-translation";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export function LangPicker({
  variant = "full",
}: {
  variant?: "full" | "compact";
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    if (locale === newLocale) return;

    // Set preference cookie so proxy.ts remembers it
    // 60 sec. × 60 min. × 24 h. × 365 days = 1 year
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;

    // Replace the current locale in the URL path
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
    router.refresh();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 h-10 rounded-full border border-lang-border text-foreground hover:bg-foreground/5 transition-colors cursor-pointer outline-none">
          <Image
            src={locale === "da" ? "/flag-dk.svg" : "/flag-en.svg"}
            alt="Current Language"
            width={20}
            height={20}
            className="rounded-sm"
          />
          {variant === "full" && (
            <span className="text-sm font-medium">
              {t(`langPicker.${locale}`)}
            </span>
          )}
          <ChevronDown size={14} className="opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => switchLanguage("da")}>
          <Image
            src="/flag-dk.svg"
            alt={t("langPicker.da")}
            width={20}
            height={20}
            className="rounded-sm"
          />
          {t("langPicker.da")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLanguage("en")}>
          <Image
            src="/flag-en.svg"
            alt={t("langPicker.en")}
            width={20}
            height={20}
            className="rounded-sm"
          />
          {t("langPicker.en")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
