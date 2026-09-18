import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarView() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    Promise.all([api.listPosts("scheduled"), api.listPosts("posted")])
      .then(([scheduled, posted]) => {
        setPosts([
          ...scheduled.map((p) => ({ ...p, calendarDate: p.scheduledFor, kind: "scheduled" })),
          ...posted.map((p) => ({ ...p, calendarDate: p.postedAt, kind: "posted" })),
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startPad = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    return cells;
  }, [viewDate]);

  function postsOn(date) {
    if (!date) return [];
    return posts.filter((p) => p.calendarDate && sameDay(new Date(p.calendarDate), date));
  }

  const selectedPosts = selectedDay ? postsOn(selectedDay) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonthOffset((m) => m - 1)}
          className="focus-ring flex h-8 w-8 items-center justify-center border border-line text-paper-dim transition-colors hover:text-paper"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-[15px] font-700 text-paper">{monthLabel}</p>
        <button
          onClick={() => setMonthOffset((m) => m + 1)}
          className="focus-ring flex h-8 w-8 items-center justify-center border border-line text-paper-dim transition-colors hover:text-paper"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <p className="font-mono text-[12px] text-paper-dim">loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 border border-line bg-panel p-2 sm:gap-1.5 sm:p-3">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center font-mono text-[10px] uppercase text-paper-dim">
                {w}
              </div>
            ))}
            {days.map((date, i) => {
              const dayPosts = postsOn(date);
              const isToday = date && sameDay(date, new Date());
              const isSelected = date && selectedDay && sameDay(date, selectedDay);
              return (
                <button
                  key={i}
                  disabled={!date}
                  onClick={() => setSelectedDay(date)}
                  className={`focus-ring flex aspect-square flex-col items-center justify-center gap-1 border text-[12px] transition-colors ${
                    !date
                      ? "border-transparent"
                      : isSelected
                      ? "border-amber bg-panel-raised text-paper"
                      : isToday
                      ? "border-line-bright text-paper"
                      : "border-line text-paper-dim hover:bg-panel-raised/40"
                  }`}
                >
                  {date && <span>{date.getDate()}</span>}
                  {dayPosts.length > 0 && (
                    <span className="flex gap-0.5">
                      {dayPosts.slice(0, 3).map((p, j) => (
                        <span
                          key={j}
                          className={`h-1 w-1 rounded-full ${
                            p.kind === "posted" ? "bg-signal-green" : "bg-amber"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-4 font-mono text-[10.5px] text-paper-dim">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" /> scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-green" /> posted
            </span>
          </div>

          {selectedDay && (
            <div className="mt-4 border border-line bg-panel p-4">
              <p className="mb-3 font-mono text-[10.5px] uppercase tracking-wide text-paper-dim">
                {selectedDay.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {selectedPosts.length === 0 ? (
                <p className="font-mono text-[12px] text-paper-dim">Nothing on this day.</p>
              ) : (
                <div className="grid gap-2">
                  {selectedPosts.map((p) => (
                    <div key={p._id} className="border border-line bg-panel-raised px-3 py-2">
                      <p className="truncate text-[12.5px] text-paper">
                        {p.generatedText?.split("\n")[0]?.slice(0, 70)}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase text-paper-dim">
                        {p.kind}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}