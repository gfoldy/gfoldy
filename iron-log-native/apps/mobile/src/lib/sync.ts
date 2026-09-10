// Push local training data to the cloud so People/Ranks/Feed reflect it.
// Uploads the split + logs (the server recomputes the profile summary) and
// posts one "session" activity per recent training day.

import { isWorking, muscleBucket, weekdayOf } from '@ironlog/core';
import type { LogSet, Split } from '@ironlog/core';
import type { Cloud, CloudUser } from './cloud';

export async function runSync(cloud: Cloud, data: { split: Split; logs: LogSet[]; unit: string; user: CloudUser }): Promise<void> {
  await cloud.pushSplit(data.split);
  await cloud.pushLogs(data.logs);

  // One session activity per training day, for the last ~21 sessions.
  const byDate = new Map<string, LogSet[]>();
  for (const l of data.logs) {
    if (!isWorking(l)) continue;
    (byDate.get(l.date) ?? byDate.set(l.date, []).get(l.date)!).push(l);
  }
  const dates = [...byDate.keys()].sort().slice(-21);
  for (const date of dates) {
    const sets = byDate.get(date)!;
    const volume = Math.round(sets.reduce((a, l) => a + (l.weight || 0) * (l.reps || 0), 0));
    const muscles = [...new Set(sets.map((l) => muscleBucket(l.muscle)))];
    const wd = data.split.find((d) => d.weekday === weekdayOf(date));
    await cloud.postActivity({
      id: `sess_${data.user.id}_${date}`,
      type: 'session',
      date,
      data: { sets: sets.length, volume, muscles, dayName: wd?.name ?? '', unit: data.unit },
    });
  }
}
