import Link from "next/link";
import { getVisitsForWeek, getTourDayStatusForWeek } from "@/lib/queries";
import { getWeekStart, getWeekDates, toDateKey } from "@/lib/calendar";
import PrintButton from "@/components/PrintButton";
import type { Visit } from "@/lib/types";

const dayNames = ["MON", "DIE", "MIT", "DON", "FRI", "SAT", "SON"];

const tagLabels: Record<string, string> = {
  duschen: "Duschen",
  arzt: "Arzt",
  betreuung: "Betreuung",
  keine_tp: "keine TP",
  kkh: "KKH",
  peg: "PEG",
  termin: "Termin",
  therapie: "Therapie",
  einkaufen: "Einkaufen",
  mit_pflege: "mit Pflege",
  reinigung: "Reinigung",
};

function hm(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.slice(0, 5).split(":");
  return `${Number(h)}.${m}`;
}

export default async function PrintToursPage({ searchParams }: { searchParams: { week?: string } }) {
  const referenceDate = searchParams.week ? new Date(searchParams.week) : new Date();
  const weekStart = getWeekStart(referenceDate);
  const weekDates = getWeekDates(weekStart);
  const startKey = toDateKey(weekDates[0]);
  const endKey = toDateKey(weekDates[6]);

  const [visits, statuses] = await Promise.all([
    getVisitsForWeek(startKey, endKey),
    getTourDayStatusForWeek(startKey, endKey),
  ]);

  // Every carer that has a visit or a day status in this week gets one page.
  const names = new Set<string>();
  visits.forEach((v) => names.add(v.staff_name ?? "Unknown"));
  statuses.forEach((s) => names.add(s.staff_name ?? "Unknown"));
  const carers = Array.from(names).sort((a, b) => a.localeCompare(b, "de"));

  const range = `${weekDates[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}-${weekDates[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  return (
    <div>
      <div className="print-hide mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Print / PDF — week of {range}</h1>
          <p className="mt-1 text-sm text-muted">
            Click the button, then choose &quot;Save as PDF&quot; as the printer. One tour (whole week) per page, A4 portrait.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/tours?week=${startKey}`} className="rounded-md border border-border px-3 py-2 text-sm text-ink hover:bg-paper">
            ← Back to tours
          </Link>
          <PrintButton />
        </div>
      </div>

      {carers.length === 0 && (
        <p className="text-sm text-muted">Nothing to print yet — generate the week on the Tours page first.</p>
      )}

      {carers.map((carer) => {
        const mine = visits.filter((v) => (v.staff_name ?? "Unknown") === carer);
        const myStatus = statuses.filter((s) => (s.staff_name ?? "Unknown") === carer);

        return (
          <section key={carer} className="print-page mb-10 bg-white p-4 print:mb-0 print:p-0">
            <h2 className="mb-2 text-lg font-bold">
              {carer} {range.replace("-", "-")}
            </h2>
            <div className="grid grid-cols-7 border border-black text-[9.5px] leading-tight">
              {weekDates.map((day, i) => {
                const key = toDateKey(day);
                const dayVisits: Visit[] = mine
                  .filter((v) => v.visit_date === key)
                  .sort((a, b) => a.sequence_order - b.sequence_order);
                const dayStatus = myStatus.filter((s) => s.status_date === key);
                const off = dayStatus.find((s) => s.status === "frei");
                const early = dayStatus.find((s) => s.status === "fd");
                const evening = dayStatus.find((s) => s.status === "abenddienst");

                return (
                  <div key={key} className="min-h-[230mm] border-r border-black last:border-r-0">
                    <div className="border-b border-black bg-gray-100 py-1 text-center text-xs font-bold">
                      {dayNames[i]}
                      <div className="text-[10px] font-normal">
                        {day.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                      </div>
                    </div>
                    {off && <p className="py-6 text-center text-sm font-bold">FREI</p>}
                    {early && <p className="border-b border-gray-300 py-1 text-center font-bold">FD</p>}
                {dayStatus.filter((x) => x.status === "sd" || x.status === "buerodienst").map((x) => (
                  <p key={x.id} className="border-b border-gray-300 py-1 text-center font-bold">
                    {x.status === "sd" ? "SD" : "Bürodienst"}
                  </p>
                ))}
                    {dayVisits.map((v) => (
                      <div key={v.id} className="border-b border-gray-300 px-1 py-[3px]">
                        <span className="font-semibold">{v.patient_name}</span>
                        {v.tags?.map((t) => (
                          <span key={t} className="ml-1 font-bold">
                            {tagLabels[t] ?? t}
                          </span>
                        ))}
                        <div>
                          {hm(v.scheduled_time)}
                          {v.end_time ? `-${hm(v.end_time)}` : ""}
                        </div>
                      </div>
                    ))}
                    {evening && (
                      <div className="px-1.5 py-1.5 text-center font-bold">
                        Abenddienst
                        {evening.companion_name && <div className="font-normal">Mit {evening.companion_name}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-gray-600">Erstellt von PDL/Stellv. PDL</p>
          </section>
        );
      })}
    </div>
  );
}
