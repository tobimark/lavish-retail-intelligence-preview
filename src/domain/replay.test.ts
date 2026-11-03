import { describe, it, expect } from 'vitest';
import { cameras, createFixture, positionAt, snapshotAt, COUNTING_Z } from './replay';

describe('canonical replay', () => {
  it('counts exactly at the visible line crossing, for both directions', () => {
    const fixture = createFixture(cameras[0], 'normal');
    for (const track of fixture.tracks) {
      expect(positionAt(track, track.crossing).z).toBeCloseTo(COUNTING_Z);
      const before = snapshotAt(fixture, track.crossing - 1), after = snapshotAt(fixture, track.crossing);
      expect(after[track.direction === 'entry' ? 'entries' : 'exits']).toBe(before[track.direction === 'entry' ? 'entries' : 'exits'] + 1);
    }
  });
  it('is deterministic under rewind, replay and reset', () => {
    const fixture = createFixture(cameras[0], 'normal');
    const expected = snapshotAt(fixture, 47000);
    snapshotAt(fixture, 120000); snapshotAt(fixture, 0);
    expect(snapshotAt(fixture, 47000)).toEqual(expected);
    expect(snapshotAt(fixture, 0).entries).toBe(0);
    expect(snapshotAt(fixture, 0).occupancy).toBe(6);
  });
  it('ignores duplicate event IDs and repeated session crossings within cooldown', () => {
    const fixture = createFixture(cameras[0], 'normal');
    const crossing = fixture.events.find(e => e.type === 'line_crossed_entry')!;
    fixture.events.push(crossing, { ...crossing, id: 'repeated-packet', atMs: crossing.atMs + 500 });
    const snapshot = snapshotAt(fixture, crossing.atMs + 600);
    expect(snapshot.entries).toBe(1); expect(snapshot.deduped).toBe(1);
  });
  it('explains synthetic repeat suppression without creating a new visit or track', () => {
    const fixture = createFixture(cameras[0], 'repeat');
    const crossing = fixture.tracks[0].crossing;
    const before = snapshotAt(fixture, crossing), after = snapshotAt(fixture, crossing + 1200);
    expect(after.visits).toBe(before.visits); expect(after.distinctTracks).toBe(before.distinctTracks);
    expect(after.deduped).toBe(1);
    expect(positionAt(fixture.tracks[0], crossing + 1200).z).toBeCloseTo(COUNTING_Z);
  });
  it('has a full two-minute timeline and isolates cameras/scenarios', () => {
    for (const camera of cameras) for (const scenario of ['normal', 'peak', 'repeat'] as const) {
      const fixture = createFixture(camera, scenario);
      expect(fixture.duration).toBe(120000);
      expect(fixture.events.every(e => e.cameraId === camera.id && e.storeId === camera.storeId)).toBe(true);
      expect(snapshotAt(fixture, 120000).occupancy).toBeGreaterThanOrEqual(0);
    }
    expect(createFixture(cameras[0], 'peak').tracks.length).toBeGreaterThan(createFixture(cameras[0], 'normal').tracks.length);
  });
  it('does not fabricate events for an offline camera', () => {
    const fixture = createFixture(cameras[2], 'normal');
    expect(snapshotAt(fixture, 120000)).toMatchObject({ available: false, entries: 0, events: [], activeTracks: [] });
  });
  it('routes anonymous people around the physical consultation island', () => {
    for (const track of createFixture(cameras[0], 'normal').tracks) {
      for (let at = track.start; at <= track.end; at += 100) {
        const p = positionAt(track, at);
        if (p.z > -4.3 && p.z < -2.3) expect(Math.abs(p.x)).toBeGreaterThan(2.4);
      }
    }
  });
});
