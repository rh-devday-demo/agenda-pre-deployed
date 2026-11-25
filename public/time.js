export const TIME_ZONE = 'Europe/Vienna';

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, dateStyle: 'full',
});
const offsetTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export const formatTime = (instant) => timeFormatter.format(instant);
export const formatDate = (instant) => dateFormatter.format(instant);

export function prepareAgenda(sessions) {
  if (!Array.isArray(sessions)) throw new Error('Expected an array of agenda sessions');

  return sessions.map((session, index) => {
    const { title, start, end } = session ?? {};
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (typeof title !== 'string' || !title.trim() ||
        !offsetTimestamp.test(start) || !offsetTimestamp.test(end) ||
        !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
      throw new Error(`Invalid agenda session at position ${index + 1}`);
    }
    return { ...session, startMs, endMs };
  }).sort((a, b) => a.startMs - b.startMs);
}

export function sessionStatus({ startMs, endMs }, now = Date.now()) {
  if (now < startMs) return 'upcoming';
  return now < endMs ? 'current' : 'completed';
}
