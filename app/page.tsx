import { getOrCreateToday, getDays, getItems, getCollections, localDateISO } from "@/lib/airtable";
import DailyView from "@/components/main";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayISO = localDateISO();
  // Rolling last 5 days ending today
  const weekDates: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(todayISO + "T00:00:00");
    d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

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
