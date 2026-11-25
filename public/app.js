import { formatDate, formatTime, prepareAgenda, sessionStatus } from './time.js';

const clock = document.querySelector('#clock');
const clockDate = document.querySelector('#clock-date');
const timeline = document.querySelector('#timeline');
const message = document.querySelector('#agenda-message');
const labels = { upcoming: 'Upcoming', current: 'Current', completed: 'Completed' };
let rows = [];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderAgenda(sessions) {
  const days = new Map();
  const renderedRows = [];
  for (const session of sessions) {
    const date = formatDate(session.startMs);
    if (!days.has(date)) days.set(date, []);
    days.get(date).push(session);
  }

  function sessionRow(session, heading) {
    const date = formatDate(session.startMs);
    const row = element('li', 'session');
    const times = element('div', 'session-time');
    const start = element('time', '', formatTime(session.startMs));
    start.dateTime = session.start;
    const endDate = formatDate(session.endMs);
    const end = element('time', '', endDate === date
      ? formatTime(session.endMs) : `${formatTime(session.endMs)} (${endDate})`);
    end.dateTime = session.end;
    times.append(start, document.createTextNode(' to '), end);

    const details = element('div', 'session-details');
    details.append(element(heading, 'session-title', session.title));
    if (session.speaker) details.append(element('p', '', session.speaker));
    if (session.description) details.append(element('p', '', session.description));

    const badge = element('span', 'badge');
    row.append(times, details, badge);
    renderedRows.push({ session, row, badge });
    return row;
  }

  function track(label, entries) {
    const column = element('div', 'track');
    const list = element('ol', 'track-list');
    list.append(...entries.map((session) => sessionRow(session, 'h6')));
    column.append(element('h5', 'track-label', label), list);
    return column;
  }

  for (const [date, entries] of days) {
    const list = element('ol', 'timeline');
    timeline.append(element('h3', 'day-label', date), list);
    const workshop = entries.find((session) => session.track === 'workshop');
    if (!workshop) {
      list.append(...entries.map((session) => sessionRow(session, 'h4')));
      continue;
    }

    const before = entries.filter((session) => session.endMs <= workshop.startMs);
    const after = entries.filter((session) => session.startMs >= workshop.endMs);
    const talks = entries.filter((session) => session !== workshop &&
      session.startMs < workshop.endMs && session.endMs > workshop.startMs);

    const block = element('li', 'parallel-block');
    const range = `${formatTime(workshop.startMs)} to ${formatTime(workshop.endMs)}`;
    const tracks = element('div', 'tracks');
    tracks.append(track('Talks', talks), track('Workshop', [workshop]));
    block.append(element('h4', 'parallel-label', `Parallel sessions: ${range}`), tracks);
    list.append(...before.map((session) => sessionRow(session, 'h4')), block,
      ...after.map((session) => sessionRow(session, 'h4')));
  }
  return renderedRows;
}

function update(now = Date.now()) {
  clock.textContent = formatTime(now);
  clock.dateTime = new Date(now).toISOString();
  clockDate.textContent = formatDate(now);

  for (const { session, row, badge } of rows) {
    const status = sessionStatus(session, now);
    if (row.dataset.status !== status) {
      row.dataset.status = status;
      badge.textContent = labels[status];
    }
  }
}

update();
setInterval(update, 1000);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) update();
});

try {
  const response = await fetch(new URL('./agenda.json', import.meta.url));
  if (!response.ok) throw new Error(`Agenda request returned ${response.status}`);
  rows = renderAgenda(prepareAgenda(await response.json()));
  update();
  message.hidden = rows.length > 0;
  if (!rows.length) message.textContent = 'The event schedule has not been provided yet.';
} catch (error) {
  console.error(error);
  message.textContent = 'The agenda could not be loaded. Refresh to try again.';
}
