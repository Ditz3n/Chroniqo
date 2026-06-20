// src/app/[locale]/(protected)/layout.tsx
import { BanWatcher } from "@/components/auth/ban-watcher";
import { DeletionWatcher } from "@/components/auth/deletion-watcher";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { RememberMeWatcher } from "@/components/auth/remember-me-watcher";
import { FloatingChat } from "@/components/chat/floating-chat";
import { LiveGameWatcher } from "@/components/chat/live-game-watcher";
import { DailyStatusProvider } from "@/context/daily-status-context";
import { DailyStatusInterceptor } from "./(components)/daily-status-interceptor";
import { Sidebar } from "./(components)/sidebar";
import { TopNavbar } from "./(components)/top-navbar";

// This synchronous script runs before the browser paints the DOM.
// If the user's client-side session is expired/missing, it instantly injects
// a CSS rule to hide the protected layout. This prevents the "Flash of Protected Content"
// while the RememberMeWatcher prepares the Auth.js signOut() redirect.
const guardScript = `
  (function() {
    try {
      var hasSession = sessionStorage.getItem("chroniqo_session");
      if (!hasSession) {
        var remember = localStorage.getItem("chroniqo_remember");
        if (!remember || Date.now() > parseInt(remember, 10)) {
          var style = document.createElement('style');
          style.innerHTML = '#protected-app-root { display: none !important; }';
          document.head.appendChild(style);
        }
      }
    } catch(e) {}
  })();
`;

export default async function ProtectedLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <ProtectedRoute locale={locale}>
      <script dangerouslySetInnerHTML={{ __html: guardScript }} />
      <DailyStatusProvider>
        {/* Enforces client-side session expiry if "Remember me" was declined */}
        <RememberMeWatcher />

        {/* DeletionWatcher polls Redis every 30s and signs out deleted users automatically */}
        <DeletionWatcher />

        {/* BanWatcher polls Redis every 30s and signs out banned users automatically */}
        <BanWatcher />

        {/* Polls for live game invitations and active turns; suppressed on low dagsform */}
        <LiveGameWatcher />

        {/* Intercepts the daily status to suppress live game popups when the user is exhausted or low energy */}
        <DailyStatusInterceptor />

        {/* Added id="protected-app-root" so the guard script can target it */}
        <div id="protected-app-root">
          <div className="flex h-[100dvh] flex-col bg-background overflow-hidden">
            <TopNavbar />
            <div className="flex flex-1 overflow-hidden relative">
              <Sidebar />
              <main className="flex-1 overflow-y-auto has-[.niqo-layout]:overflow-hidden transition-[margin-left] duration-300 md:ml-[88px] min-[1080px]:ml-0 has-[.expanded-layout]:md:ml-64 relative pb-16 md:pb-0">
                {props.children}
              </main>
            </div>
          </div>
          <FloatingChat />
        </div>
      </DailyStatusProvider>
    </ProtectedRoute>
  );
}
