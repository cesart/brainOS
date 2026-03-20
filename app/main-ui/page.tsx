import { getDays, getItems, getCollections, getOrCreateToday } from "@/lib/airtable";
import { Dashboard } from "@/components/main-ui/dashboard";

export const dynamic = "force-dynamic";

export default async function MainUIPage() {
  const [today, allDays, allItems, collections] = await Promise.all([
    getOrCreateToday(),
    getDays(),
    getItems(),
    getCollections(),
  ]);

  const sortedDays = allDays.sort(
    (a, b) => new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime()
  );

  return (
    <Dashboard
      today={today}
      allDays={sortedDays}
      allItems={allItems}
      collections={collections}
    />
  );
}
