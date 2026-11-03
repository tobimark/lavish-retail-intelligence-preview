export type ScenarioId = 'normal' | 'peak' | 'repeat';
export type Direction = 'entry' | 'exit';
export type EventType = 'track_started' | 'line_crossed_entry' | 'line_crossed_exit' | 'duplicate_crossing_ignored' | 'track_ended';
export interface Camera { id: string; storeId: string; store: string; name: string; zone: string; status: 'online' | 'offline'; angle: number; openingOccupancy: number }
export interface Track { id: string; cameraId: string; start: number; crossing: number; end: number; x: number; direction: Direction; confidence: number; color: number; repeat: boolean }
export interface CameraEvent { id: string; cameraId: string; storeId: string; atMs: number; type: EventType; trackId: string; visitSessionId: string; confidence: number }
export interface Fixture { duration: number; tracks: Track[]; events: CameraEvent[]; camera: Camera; scenario: ScenarioId }

export const DURATION = 120_000;
export const COUNTING_Z = 2.4;
export const cameras: Camera[] = [
  { id: 'CAM-DXB-01', storeId: 'dubai-mall', store: 'Dubai Mall', name: 'Main entrance', zone: 'Ground floor · Entrance A', status: 'online', angle: 0, openingOccupancy: 6 },
  { id: 'CAM-DXB-02', storeId: 'dubai-mall', store: 'Dubai Mall', name: 'East entrance', zone: 'Ground floor · Entrance B', status: 'online', angle: 1, openingOccupancy: 3 },
  { id: 'CAM-MOE-01', storeId: 'emirates', store: 'Mall of the Emirates', name: 'Main entrance', zone: 'Level 1 · Entrance A', status: 'offline', angle: 0, openingOccupancy: 0 },
];
export const scenarios: { id: ScenarioId; name: string; description: string }[] = [
  { id: 'normal', name: 'Normal traffic', description: 'A measured flow of arrivals and departures.' },
  { id: 'peak', name: 'Peak hour', description: 'More simultaneous tracks, one consistent event source.' },
  { id: 'repeat', name: 'Repeat entrance', description: 'A brief repeated crossing is suppressed within 3 seconds.' },
];

export function createFixture(camera: Camera, scenario: ScenarioId): Fixture {
  if (camera.status === 'offline') return { duration: DURATION, tracks: [], events: [], camera, scenario };
  const starts = scenario === 'peak' ? Array.from({ length: 26 }, (_, i) => i * 4400 - 4000)
    : scenario === 'repeat' ? [-3000, 14000, 33000, 51000, 74000, 98000]
    : [-4000, 1500, 6000, 12000, 20500, 31000, 41000, 51000, 61500, 74000, 85000, 96000, 107000];
  const tracks: Track[] = starts.map((start, i) => ({
    id: `T-${String(i + 1).padStart(3, '0')}`, cameraId: camera.id, start, crossing: start + 6500, end: start + 17000,
    x: [-2.9, 1.8, -.8, 3.4, -3.8, .5][(i + camera.angle) % 6],
    direction: i % 4 === 2 ? 'exit' : 'entry', confidence: [98, 96, 97, 95, 99][i % 5],
    color: [0x4b534a, 0xd3c5ae, 0x333738, 0x987560, 0x807b71][i % 5], repeat: scenario === 'repeat' && i % 2 === 0,
  }));
  const events = tracks.flatMap(t => {
    const base = { cameraId: camera.id, storeId: camera.storeId, trackId: t.id, visitSessionId: `${camera.id}:${scenario}:${t.id}`, confidence: t.confidence };
    const list: CameraEvent[] = [
      { ...base, id: `${t.id}-start`, atMs: Math.max(0, t.start), type: 'track_started' },
      { ...base, id: `${t.id}-cross`, atMs: t.crossing, type: t.direction === 'entry' ? 'line_crossed_entry' : 'line_crossed_exit' },
      { ...base, id: `${t.id}-end`, atMs: t.end, type: 'track_ended' },
    ];
    if (t.repeat) list.push({ ...base, id: `${t.id}-repeat`, atMs: t.crossing + 1200, type: 'duplicate_crossing_ignored' });
    return list;
  }).filter(e => e.atMs <= DURATION).sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id));
  return { duration: DURATION, tracks, events, camera, scenario };
}

export function positionAt(track: Track, atMs: number): { x: number; z: number; progress: number } {
  const progress = Math.max(0, Math.min(1, (atMs - track.start) / (track.end - track.start)));
  let z: number;
  if (atMs <= track.crossing) {
    const t = (atMs - track.start) / (track.crossing - track.start);
    z = track.direction === 'entry' ? 7.6 + (COUNTING_Z - 7.6) * t : -5.8 + (COUNTING_Z + 5.8) * t;
  } else {
    let elapsed = atMs - track.crossing;
    if (track.repeat && elapsed <= 1600) {
      // A repeated crossing at +1200ms, exactly matching its ignored event.
      const bounce = elapsed <= 400 ? elapsed / 400 : elapsed <= 800 ? 1 - (elapsed - 400) / 200 : elapsed <= 1200 ? -1 + (elapsed - 800) / 400 : (elapsed - 1200) / 400;
      z = COUNTING_Z + (track.direction === 'entry' ? -.24 : .24) * bounce;
      return { x: track.x, z, progress };
    }
    if (track.repeat) elapsed = Math.max(0, elapsed - 1600);
    const t = elapsed / (track.end - track.crossing - (track.repeat ? 1600 : 0));
    z = track.direction === 'entry' ? COUNTING_Z + (-5.8 - COUNTING_Z) * t : COUNTING_Z + (7.6 - COUNTING_Z) * t;
  }
  // Bend the aisle path around the consultation island rather than walking through it.
  const aisleBlend = Math.max(0, Math.min(1, (-z - .5) / 1.5));
  const aisleX = Math.abs(track.x) < 2.8 ? (track.x < 0 ? -2.8 : 2.8) : track.x;
  return { x: track.x + (aisleX - track.x) * aisleBlend, z, progress };
}

export function snapshotAt(fixture: Fixture, atMs: number) {
  const at = Math.max(0, Math.min(fixture.duration, atMs));
  const seen = new Set<string>();
  const counted = new Map<string, number>();
  const tracks = new Set<string>();
  let entries = 0, exits = 0, deduped = 0;
  const events: CameraEvent[] = [];
  for (const event of fixture.events) {
    if (event.atMs > at || seen.has(event.id)) continue;
    seen.add(event.id);
    tracks.add(event.trackId);
    if (event.type === 'track_started' || event.type === 'track_ended') continue;
    const key = `${event.visitSessionId}:${event.type}`;
    if (event.type === 'duplicate_crossing_ignored') deduped++;
    else if (counted.has(key) && event.atMs - counted.get(key)! < 3000) {
      deduped++;
      events.push({ ...event, type: 'duplicate_crossing_ignored' });
      continue;
    } else {
      counted.set(key, event.atMs);
      if (event.type === 'line_crossed_entry') entries++;
      else if (event.type === 'line_crossed_exit') exits++;
    }
    events.push(event);
  }
  return { entries, exits, visits: entries, deduped, distinctTracks: tracks.size,
    occupancy: Math.max(0, fixture.camera.openingOccupancy + entries - exits),
    activeTracks: fixture.tracks.filter(t => t.start <= at && t.end > at),
    events: events.reverse(), atMs: at, available: fixture.camera.status === 'online',
  };
}

export function clockTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `14:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
export function elapsedTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
