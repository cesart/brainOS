import { getOrCreateToday, getDays, getItems, getCollections, localDateISO } from "@/lib/airtable";
import { makeDemoDay, makeDemoItems, DEMO_COLLECTIONS } from "@/lib/demo";
import DailyView from "@/components/main";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const todayISO = localDateISO();
  const weekDates: string[] = [];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(todayISO + "T00:00:00");
    d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const isDemo = headers().get("x-demo-mode") === "1";

  if (isDemo) {
    const today = makeDemoDay(todayISO);
    const weekDays = weekDates.map((date) => makeDemoDay(date));
    return (
      <DailyView
        initialDay={today}
        todayISO={todayISO}
        weekDates={weekDates}
        weekDays={weekDays}
        allItems={makeDemoItems(todayISO)}
        collections={DEMO_COLLECTIONS}
      />
    );
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
