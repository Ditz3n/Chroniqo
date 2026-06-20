import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string; locale: string }>;
}) {
  const session = await auth();
  const { username, locale } = await params;

  if (!session?.user?.username || session.user.username !== username) {
    redirect(`/${locale}/u/${username}`);
  }

  return <>{children}</>;
}
