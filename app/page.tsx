import { getOrCreateToday, getDays, getItems, getCollections, localDateISO } from "@/lib/airtable";
import DailyView from "@/components/daily-view";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayISO = localDateISO();
  const weekDates = [-1, 0, 1, 2, 3].map((offset) => localDateISO(offset));

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
