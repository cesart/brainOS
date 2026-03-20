import { AirtableDay, AirtableItem, AirtableCollection, localDateISO } from "@/lib/airtable";
import DailyView from "@/components/daily-view";

interface DashboardProps {
  today: AirtableDay;
  allDays: AirtableDay[];
  allItems: AirtableItem[];
  collections: AirtableCollection[];
}

export function Dashboard({ today, allDays, allItems, collections }: DashboardProps) {
  const todayISO = today.date ?? localDateISO();

  // Build last 7 days ending today
  const weekDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayISO + "T00:00:00");
    d.setDate(d.getDate() - i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const weekDays: (AirtableDay | null)[] = weekDates.map(
    (date) => allDays.find((d) => d.date === date) ?? null
  );

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
