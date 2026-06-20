// src/app/(components)/nav-bar.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useSmoothScroll } from "@/lib/hooks/use-smooth-scroll";
import { useTranslation } from "@/lib/hooks/use-translation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChroniqoLogo } from "./chroniqo-logo";
import { LangPicker } from "./lang-picker";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  const { t, locale } = useTranslation();
  const { handleSmoothScroll, scrollToTop } = useSmoothScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Effect to track scroll position for pill styling
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Effect to close mobile menu on resize to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navLinks = [
    { label: t("navBar.features"), href: `/${locale}#features` },
    { label: t("navBar.about"), href: `/${locale}#about` },
    { label: t("navBar.privacy"), href: `/${locale}/privacy` },
  ];

  return (
    <nav
      data-scrolled={scrolled}
      className="nav-root fixed z-50 w-full transition-all duration-500 ease-in-out"
    >
      {/* Main bar */}
      <div
        className={`flex items-center justify-between transition-all duration-500 border ${
          scrolled
            ? "rounded-full backdrop-blur-xl shadow-lg px-6 py-4 bg-navbar-bg border-navbar-border"
            : mobileOpen
              ? "rounded-none px-4 sm:px-12 py-6 bg-navbar-bg border-navbar-border backdrop-blur-xl"
              : "rounded-none px-4 sm:px-12 py-6 bg-transparent border-transparent"
        }`}
      >
        <Link
          href={`/${locale}`}
          className="flex items-center gap-3 cursor-pointer"
          onClick={(e) => {
            if (
              window.location.pathname === `/${locale}` ||
              window.location.pathname === "/"
            ) {
              scrollToTop(e, `/${locale}`);
            }
          }}
        >
          <ChroniqoLogo width={44} height={44} className="text-foreground" />

          <span className="font-heading font-extrabold text-xl tracking-tight text-foreground">
            {t("navBar.logo_prefix")}
            <span className="text-brand transition-colors duration-500">
              {t("navBar.logo_accent")}
            </span>
            {t("navBar.logo_suffix")}
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-8">
          <div className="flex gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={(e) => handleSmoothScroll(e, link.href)}
                className="text-base font-sans text-foreground transition-opacity hover:opacity-70 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="w-px h-[22px] bg-divider" />

          <div className="flex items-center gap-4">
            <LangPicker variant="compact" />
            <ThemeToggle />
            <Link href={`/${locale}/login`}>
              <Button variant="primary" size="sm">
                {t("navBar.login")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex lg:hidden items-center gap-3">
          <LangPicker variant="compact" />
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex items-center justify-center text-foreground focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg
              className={`ham-menu ${mobileOpen ? "active" : ""}`}
              viewBox="0 0 100 100"
              width="36"
              height="36"
            >
              <path
                className="line top"
                d="m 30,33 h 40 c 3.722839,0 7.5,3.126468 7.5,8.578427 0,5.451959 -2.727029,8.421573 -7.5,8.421573 h -20"
              />
              <path className="line middle" d="m 30,50 h 40" />
              <path
                className="line bottom"
                d="m 70,67 h -40 c 0,0 -7.5,-0.802118 -7.5,-8.365747 0,-7.563629 7.5,-8.634253 7.5,-8.634253 h 20"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        data-scrolled={scrolled}
        data-open={mobileOpen}
        className="mobile-menu lg:hidden bg-navbar-bg backdrop-blur-xl border border-navbar-border"
      >
        <div className="flex flex-col px-6 py-5 gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={(e) =>
                handleSmoothScroll(e, link.href, () => setMobileOpen(false))
              }
              className="text-base font-sans text-foreground transition-opacity hover:opacity-70 py-1"
            >
              {link.label}
            </Link>
          ))}
          <Link href={`/${locale}/login`} className="w-full mt-2">
            <Button variant="primary" className="w-full">
              {t("navBar.login")}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
