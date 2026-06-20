// src/app/api/auth/popup-callback/route.ts
import { prisma } from "@/lib/prisma";
import da from "@/messages/da.json";
import en from "@/messages/en.json";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// This route is the final destination for the Google OAuth popup flow.
// It sends a postMessage to the opener window and closes the popup.
// Two cases handled:
//   1. Banned login attempt - ban params arrive as query string from auth.ts signIn callback
//   2. Successful login - session cookie checked for a ban applied while already logged in
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // Case 1: banned user attempted OAuth sign-in.
  // auth.ts redirected here with ban params rather than to /login directly,
  // so the popup can notify the opener and close itself cleanly.
  if (searchParams.get("banned") === "true") {
    const banPayload = {
      type: "OAUTH_BANNED",
      token: searchParams.get("token"),
      reason: searchParams.get("reason"),
      expires: searchParams.get("expires"),
      dataAlreadyDeleted: searchParams.get("dataAlreadyDeleted") === "true",
    };

    const html = buildHtml(JSON.stringify(banPayload));
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Case 2: successful sign-in - check if this user has a ban that was applied
  // while they were already authenticated (edge case, belt-and-suspenders check).
  const cookieStore = await cookies();
  const sessionToken =
    cookieStore.get("next-auth.session-token")?.value ||
    cookieStore.get("__Secure-next-auth.session-token")?.value;

  let banPayload = null;
  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });
    if (session?.user?.email) {
      const activeBan = await prisma.globalBan.findFirst({
        where: {
          email: session.user.email,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      if (activeBan) {
        banPayload = {
          type: "OAUTH_BANNED",
          token: activeBan.deleteToken ?? null,
          reason: activeBan.reason ?? null,
          expires: activeBan.expiresAt ?? null,
          dataAlreadyDeleted: activeBan.userId === null,
        };
      }
    }
  }

  if (banPayload) {
    const html = buildHtml(JSON.stringify(banPayload));
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Case 3: Show Remember Me Prompt for Google Sign-In
  const showRemember = searchParams.get("showRemember") === "true";
  const locale = searchParams.get("locale") === "en" ? "en" : "da";
  const theme = searchParams.get("theme") === "dark" ? "dark" : "light";

  if (showRemember) {
    const html = buildRememberMeHtml(locale, theme);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  // Fallback (e.g. if showRemember wasn't passed)
  const html = buildHtml(`{ type: 'google-auth-success', rememberMe: false }`);
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

function buildHtml(messageJson: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <p>Authentication successful! You can close this window.</p>
        <script>
          if (window.opener) {
            window.opener.postMessage(${messageJson}, window.location.origin);
          }
          window.close();
        </script>
      </body>
    </html>
  `;
}

// Interstitial card matching Chroniqo design tokens.
// Inline styles are necessary here - this is a server-rendered HTML string
// served from a Route Handler where Tailwind utilities are not available.
function buildRememberMeHtml(
  locale: "da" | "en",
  theme: "light" | "dark",
): string {
  const t = locale === "en" ? en.auth : da.auth;
  const isDark = theme === "dark";

  // Exact token values from globals.css
  // Page bg   -> --background
  // Card bg   -> --surface-opaque (dark) / --surface (light) - matches login card
  // Border    -> --surface-border
  const pageBg = isDark ? "#121212" : "#f7f7f5";
  const cardBg = isDark ? "#1e1e1e" : "#eeede9";
  const cardBorder = isDark ? "rgba(255,255,255,0.078)" : "rgba(0,0,0,0.071)";
  const textColor = isDark ? "#f7f7f5" : "#121212";
  const textMuted = isDark ? "rgba(247,247,245,0.6)" : "rgba(18,18,18,0.6)";
  const textMutedHover = isDark ? "#f7f7f5" : "#121212";

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)   scale(1);    }
          }

          body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${pageBg};
            color: ${textColor};
            font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
            /* Tight padding so the card fills the popup with minimal edge breathing room */
            padding: 1.75rem;
          }

          .card {
            background: ${cardBg};
            border: 1px solid ${cardBorder};
            border-radius: 2rem;
            padding: 2.5rem 2.5rem 2rem;
            width: 100%;
            min-height: calc(100vh - 5.5rem);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            animation: fadeSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          /* "Chroniqo" wordmark - Chroni + o foreground, q brand */
          .logo-text {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 1.5rem;
            letter-spacing: -0.5px;
            line-height: 1;
            color: ${textColor};
          }
          .logo-text .accent { color: #e65c69; }

          .title {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 1.0625rem;
            text-align: center;
            line-height: 1.35;
            color: ${textColor};
          }

          .buttons {
            width: 100%;
            max-width: 320px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.375rem;
            margin-top: 0.25rem;
          }

          .btn-primary {
            display: block;
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 9999px;
            border: none;
            background: #e65c69;
            color: white;
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: opacity 0.15s ease;
            outline: none;
            -webkit-tap-highlight-color: transparent;
          }
          .btn-primary:hover  { opacity: 0.88; }
          .btn-primary:active { opacity: 0.72; }

          /* Plain text button - no border, no background, muted color fades to foreground on hover */
          .btn-ghost {
            display: block;
            background: none;
            border: none;
            padding: 0.5rem 1rem;
            color: ${textMuted};
            font-family: 'Inter', sans-serif;
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            transition: color 0.15s ease;
            outline: none;
            -webkit-tap-highlight-color: transparent;
          }
          .btn-ghost:hover { color: ${textMutedHover}; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo-text">Chroni<span class="accent">q</span>o</div>
          <h1 class="title">${t.remember_me_title}</h1>
          <div class="buttons">
            <button class="btn-primary" onclick="submitChoice(true)">${t.remember_me_yes}</button>
            <button class="btn-ghost"   onclick="submitChoice(false)">${t.remember_me_no}</button>
          </div>
        </div>
        <script>
          function submitChoice(rememberMe) {
            if (window.opener) {
              window.opener.postMessage(
                { type: 'google-auth-success', rememberMe: rememberMe },
                window.location.origin
              );
            }
            window.close();
          }
        </script>
      </body>
    </html>
  `;
}
