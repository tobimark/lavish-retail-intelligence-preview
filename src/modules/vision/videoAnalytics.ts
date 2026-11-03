export type FaceObservation = {
  anonymous_person_id: string;
  track_index: number;
  bbox: [number, number, number, number];
  detection_confidence: number;
  matching_confidence: number | null;
  face_quality: number;
  is_confirmed: boolean;
  confirmed_at_ms: number | null;
};

export type VideoFrameAnalysis = {
  video_time_ms: number;
  faces: FaceObservation[];
};

export type IdentityEvent = {
  video_time_ms: number;
  anonymous_person_id: string;
  evidence: string;
  hits_at_confirmation: number;
  avg_detection_confidence: number;
  max_face_px: number;
};

export type VideoTimeline = {
  video_time_ms: number;
  duration_ms: number;
  frames: VideoFrameAnalysis[];
};

export type VideoMetrics = {
  source_video: string;
  video: { width: number; height: number; fps: number; duration_seconds: number; duration_ms: number; total_frames: number };
  counts: { candidate_identities: number; confirmed_recognizable_face_uv: number; excluded_low_support_tracklets: number; confirmed_identity_events: number; max_detected_faces_in_one_frame: number };
  models: Record<string, { role: string; bytes: number; sha256: string; source: string }>;
  pipeline: Record<string, string>;
  parameters: Record<string, number | string>;
  metric_definition: string;
  quality_control: { sample_times_sec: number[]; detections_with_face: number; total_samples: number; single_frame_tracklets_excluded: number; 'pairwise_confirmed_similarity_over_0.30': { a: string; b: string; cosine_similarity: number }[] };
  identities: { anonymous_person_id: string; first_ms: number; last_ms: number; observed_samples: number; max_face_px: number; avg_detection_confidence: number; avg_matching_confidence: number | null; confirmed: boolean; confirmed_at_ms: number | null }[];
  events: IdentityEvent[];
  limitations: string[];
  privacy: string;
};

export type VisibleFace = {
  id: string;
  bbox: [number, number, number, number];
  confidence: number;
  matching: number | null;
  isConfirmed: boolean;
};

export async function loadVideoAnalysis(source = { timelineUrl: '/demo/face_uv_timeline.json', metricsUrl: '/demo/face_uv_metrics.json' }) {
  const [timelineResponse, metricsResponse] = await Promise.all([
    fetch(source.timelineUrl),
    fetch(source.metricsUrl),
  ]);
  if (!timelineResponse.ok || !metricsResponse.ok) throw new Error('Face-UV analysis data is unavailable.');
  const timeline = (await timelineResponse.json()) as VideoTimeline;
  const metrics = (await metricsResponse.json()) as VideoMetrics;
  return { timeline, metrics };
}

const lastFrameAtOrBefore = (frames: VideoFrameAnalysis[], timeMs: number) => {
  let lo = 0;
  let hi = frames.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].video_time_ms <= timeMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
};

/** Interpolate face boxes between the 10 fps model samples so boxes track the video smoothly. */
export function facesAt(timeline: VideoTimeline | null, timeMs: number): VisibleFace[] {
  if (!timeline || !timeline.frames.length) return [];
  const i = lastFrameAtOrBefore(timeline.frames, timeMs);
  const before = timeline.frames[i];
  const after = timeline.frames[Math.min(i + 1, timeline.frames.length - 1)];
  if (!before) return [];
  const span = after.video_time_ms - before.video_time_ms;
  const ratio = span > 0 ? Math.max(0, Math.min(1, (timeMs - before.video_time_ms) / span)) : 0;
  const beforeById = new Map(before.faces.map(face => [face.anonymous_person_id, face]));
  const afterById = new Map(after.faces.map(face => [face.anonymous_person_id, face]));
  const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
  const faces: VisibleFace[] = [];
  for (const id of ids) {
    const a = beforeById.get(id);
    const b = afterById.get(id);
    const anchor = b && (!a || Math.abs(after.video_time_ms - timeMs) < Math.abs(timeMs - before.video_time_ms)) ? b : a;
    if (!anchor) continue;
    // Interpolate only when both samples are close enough; otherwise hold the nearest observation.
    const close = a && b && span <= 160;
    const bbox: [number, number, number, number] = close
      ? [a.bbox[0] + (b.bbox[0] - a.bbox[0]) * ratio, a.bbox[1] + (b.bbox[1] - a.bbox[1]) * ratio, a.bbox[2] + (b.bbox[2] - a.bbox[2]) * ratio, a.bbox[3] + (b.bbox[3] - a.bbox[3]) * ratio]
      : anchor.bbox;
    faces.push({
      id,
      bbox,
      confidence: anchor.detection_confidence,
      matching: anchor.matching_confidence,
      isConfirmed: anchor.is_confirmed,
    });
  }
  return faces.sort((a, b) => a.bbox[0] - b.bbox[0]);
}

export function confirmedUvAt(metrics: VideoMetrics | null, timeMs: number) {
  if (!metrics) return 0;
  return metrics.events.filter(event => event.video_time_ms <= timeMs).length;
}

export function confirmedEventsAt(metrics: VideoMetrics | null, timeMs: number) {
  if (!metrics) return [];
  return metrics.events.filter(event => event.video_time_ms <= timeMs);
}

export function faceUvSeries(timeline: VideoTimeline | null, metrics: VideoMetrics | null) {
  if (!timeline) return [];
  const events = metrics?.events ?? [];
  return timeline.frames.map(frame => ({
    timeMs: frame.video_time_ms,
    uv: events.filter(event => event.video_time_ms <= frame.video_time_ms).length,
    visible: frame.faces.length,
  }));
}

export function formatVideoTime(seconds: number) {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const secs = safe - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;
}
