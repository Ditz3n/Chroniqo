// src/app/[locale]/(protected)/daily-status/page.tsx
import { CalendarView } from "./(components)/calendar-view";

export default async function DailyStatusPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  return (
    <div className="flex flex-col w-full h-full p-4 sm:p-6 overflow-hidden">
      <CalendarView locale={locale} />
    </div>
  );
}
