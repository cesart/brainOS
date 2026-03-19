import { getOrCreateToday, getDays, getItems, getCollections, localDateISO } from "@/lib/airtable";
import DailyView from "@/components/daily-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayISO = localDateISO();
  // Mon–Fri of the current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [today, allDays, allItems, collections] = await Promise.all([
    getOrCreateToday(),
    getDays(),
    getItems(),
    getCollections(),
  ]);

  const weekDays = weekDates.map((date) => allDays.find((d) => d.date === date) ?? null);

  return (
    <DailyView
      initialDay={today}
      todayISO={todayISO}
      weekDates={weekDates}
      weekDays={weekDays}
      allItems={allItems}
      collections={collections}
    />
  );
}
