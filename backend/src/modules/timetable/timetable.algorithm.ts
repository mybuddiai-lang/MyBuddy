export interface NoteWeight {
  noteId: string;
  noteTitle: string;
  masteryLevel: number; // 0–5
}

export interface SlotPlan {
  noteId: string;
  noteTitle: string;
  minutes: number;
  order: number;
}

export interface DayPlan {
  dayNumber: number; // 1-based
  date: Date;
  slots: SlotPlan[];
  totalMinutes: number;
}

export function buildSchedule(
  notes: NoteWeight[],
  examDate: Date,
  hoursPerDay: number,
  startDate: Date = new Date(),
): DayPlan[] {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const exam  = new Date(examDate);
  exam.setHours(0, 0, 0, 0);

  const daysAvailable = Math.floor((exam.getTime() - start.getTime()) / MS_PER_DAY);
  if (daysAvailable <= 0) throw new Error('Exam date must be in the future');

  const minutesPerDay  = Math.round(hoursPerDay * 60);
  const totalMinutes   = daysAvailable * minutesPerDay;

  // Weight: lower mastery → more time. Min weight = 1 so even mastered notes appear briefly.
  const weights = notes.map(n => ({ ...n, weight: Math.max(1, 6 - n.masteryLevel) }));
  const totalWeight = weights.reduce((s, n) => s + n.weight, 0);

  // Proportional allocation per note (in minutes)
  const noteMinutes = weights.map(n => ({
    ...n,
    remaining: Math.round((n.weight / totalWeight) * totalMinutes),
  }));

  const days: DayPlan[] = [];

  for (let d = 0; d < daysAvailable; d++) {
    const dayDate = new Date(start.getTime() + d * MS_PER_DAY);
    let budgetLeft = minutesPerDay;
    const slots: SlotPlan[] = [];
    let order = 0;

    // Sort by remaining minutes descending so high-priority notes fill first
    const sorted = [...noteMinutes].sort((a, b) => b.remaining - a.remaining);

    for (const note of sorted) {
      if (budgetLeft <= 0 || note.remaining <= 0) continue;
      const alloc = Math.min(note.remaining, budgetLeft, Math.ceil(minutesPerDay * 0.7));
      if (alloc < 10) continue; // skip tiny slivers

      slots.push({ noteId: note.noteId, noteTitle: note.noteTitle, minutes: alloc, order: order++ });
      // Deduct from the shared note state
      const orig = noteMinutes.find(x => x.noteId === note.noteId);
      if (orig) orig.remaining -= alloc;
      budgetLeft -= alloc;
    }

    if (slots.length > 0) {
      days.push({ dayNumber: d + 1, date: dayDate, slots, totalMinutes: minutesPerDay - budgetLeft });
    }
  }

  return days;
}
