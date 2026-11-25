import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { formatDate, formatTime, prepareAgenda, sessionStatus } from '../public/time.js';

const fixture = { title: 'Test session', start: '2026-04-15T09:00:00+02:00', end: '2026-04-15T09:30:00+02:00' };
const [session] = prepareAgenda([fixture]);

test('uses an inclusive start and exclusive end, to the millisecond', () => {
  assert.equal(sessionStatus(session, session.startMs - 1), 'upcoming');
  assert.equal(sessionStatus(session, session.startMs), 'current');
  assert.equal(sessionStatus(session, session.endMs - 1), 'current');
  assert.equal(sessionStatus(session, session.endMs), 'completed');
  assert.equal(sessionStatus(session, session.endMs + 1), 'completed');
});

test('back-to-back sessions switch status at the same instant', () => {
  const [next] = prepareAgenda([{ ...fixture, start: fixture.end, end: '2026-04-15T10:00:00+02:00' }]);
  assert.equal(sessionStatus(session, next.startMs), 'completed');
  assert.equal(sessionStatus(next, next.startMs), 'current');
});

test('Vienna time follows both winter and summer offsets', () => {
  assert.equal(formatTime(Date.parse('2026-01-15T08:00:00Z')), '09:00');
  assert.equal(formatTime(Date.parse('2026-07-15T08:00:00Z')), '10:00');
});

test('the Vienna calendar date advances at local midnight', () => {
  assert.equal(formatDate(Date.parse('2026-04-15T21:59:59Z')), 'Wednesday, 15 April 2026');
  const midnight = Date.parse('2026-04-15T22:00:00Z');
  assert.equal(formatDate(midnight), 'Thursday, 16 April 2026');
  assert.equal(formatTime(midnight), '00:00');
});

test('the repeated hour at the end of daylight saving time uses distinct instants', () => {
  const [overnight] = prepareAgenda([{
    ...fixture, start: '2026-10-25T02:15:00+02:00', end: '2026-10-25T02:15:00+01:00',
  }]);
  assert.equal(overnight.endMs - overnight.startMs, 3_600_000);
  assert.equal(sessionStatus(overnight, Date.parse('2026-10-25T01:00:00Z')), 'current');
});

test('sorts by instant rather than timestamp text and preserves supplied titles', () => {
  const earlier = { title: 'Earlier', start: '2026-04-15T08:30:00+02:00', end: '2026-04-15T09:00:00+02:00' };
  const later = { ...fixture, start: '2026-04-15T07:00:00Z' };
  assert.deepEqual(prepareAgenda([later, earlier]).map(({ title }) => title), ['Earlier', fixture.title]);
});

test('rejects timestamps without an explicit offset and non-positive durations', () => {
  assert.throws(() => prepareAgenda([{ ...fixture, start: '2026-04-15T09:00:00' }]), /position 1/);
  assert.throws(() => prepareAgenda([{ ...fixture, end: fixture.start }]), /position 1/);
});

test('the published workshop stays current as the concurrent talks change', () => {
  const data = readFileSync(new URL('../public/agenda.json', import.meta.url), 'utf8');
  const sessions = prepareAgenda(JSON.parse(data));
  const currentAt = (timestamp) => sessions
    .filter((entry) => sessionStatus(entry, Date.parse(timestamp)) === 'current')
    .map(({ title }) => title);
  assert.deepEqual(currentAt('2026-11-26T14:45:00+01:00'), [
    '(optional) Hands-on Workshop', 'Application Modernization in the AI Era',
  ]);
  assert.deepEqual(currentAt('2026-11-26T16:00:00+01:00'), ['Networking']);
});
