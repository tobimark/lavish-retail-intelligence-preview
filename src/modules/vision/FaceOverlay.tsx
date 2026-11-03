import { facesAt, type VideoTimeline, type VisibleFace } from './videoAnalytics';

type Props = {
  timeline: VideoTimeline | null;
  currentTimeMs: number;
  showDetections: boolean;
  showTrails: boolean;
  showLabels?: boolean;
  showEmpty?: boolean;
};

const GOOD = '#4FB286';
const PENDING = '#B8B4A8';
const CHIP_W = 236;
const CHIP_H = 40;
const TOP_SAFE = 120;
const BOTTOM_SAFE = 100;

function trailsFor(timeline: VideoTimeline | null, id: string, timeMs: number) {
  if (!timeline) return '';
  const points: string[] = [];
  for (let i = timeline.frames.length - 1; i >= 0; i--) {
    const frame = timeline.frames[i];
    if (frame.video_time_ms > timeMs) continue;
    if (frame.video_time_ms < timeMs - 1600) break;
    const face = frame.faces.find(item => item.anonymous_person_id === id);
    if (face) points.push(`${face.bbox[0] + face.bbox[2] / 2},${face.bbox[1] + face.bbox[3]}`);
  }
  return points.reverse().join(' ');
}

type Chip = { face: VisibleFace; chipX: number; chipY: number; moved: boolean };

/** Labels are collision-resolved in source-video coordinates, then drawn together with the boxes.
 *  Only label chips/leader lines move; detection boxes remain the raw model projections. */
function layoutChips(faces: VisibleFace[]): Chip[] {
  const preferred = faces.map(face => {
    const [x, y, , h] = face.bbox;
    const above = y > CHIP_H + 8;
    const rawY = above ? y - CHIP_H - 4 : y + h + 4;
    return { face, chipX: Math.max(6, Math.min(x, 1280 - CHIP_W - 6)), preferredY: rawY };
  });
  preferred.sort((a, b) => a.preferredY - b.preferredY || a.chipX - b.chipX);
  const placed: { left: number; right: number; top: number; bottom: number }[] = [];
  const maxY = 720 - BOTTOM_SAFE - CHIP_H;
  const overlaps = (rect: { left: number; right: number; top: number; bottom: number }) =>
    placed.some(other => rect.left < other.right + 4 && rect.right > other.left - 4 && rect.top < other.bottom + 4 && rect.bottom > other.top - 4);
  const chips: Chip[] = [];
  for (const item of preferred) {
    let chipY = Math.max(TOP_SAFE, Math.min(maxY, item.preferredY));
    const directions = [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7];
    for (const direction of directions) {
      const candidate = Math.max(TOP_SAFE, Math.min(maxY, item.preferredY + direction * (CHIP_H + 4)));
      const rect = { left: item.chipX, right: item.chipX + CHIP_W, top: candidate, bottom: candidate + CHIP_H };
      if (!overlaps(rect)) { chipY = candidate; break; }
    }
    placed.push({ left: item.chipX, right: item.chipX + CHIP_W, top: chipY, bottom: chipY + CHIP_H });
    chips.push({ face: item.face, chipX: item.chipX, chipY, moved: Math.abs(chipY - item.preferredY) > 4 });
  }
  return chips;
}

function FaceBox({ face }: { face: VisibleFace }) {
  const [x, y, w, h] = face.bbox;
  const color = face.isConfirmed ? GOOD : PENDING;
  return <>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="2.5" strokeOpacity=".95" />
    <path d={`M${x} ${y + 14}V${y}h14 M${x + w - 14} ${y}h14v14 M${x} ${y + h - 14}v14h14 M${x + w - 14} ${y + h}h14v-14`} stroke={color} strokeWidth="3" fill="none" />
  </>;
}

function FaceTag({ chip }: { chip: Chip }) {
  const { face, chipX, chipY, moved } = chip;
  const [x, y, w, h] = face.bbox;
  const color = face.isConfirmed ? GOOD : PENDING;
  const leaderX = Math.max(x + 6, Math.min(x + w - 6, chipX + CHIP_W / 2));
  const leaderFromY = chipY > y ? chipY : chipY + CHIP_H;
  const leaderToY = chipY > y ? y + h : y;
  return (
    <g className="face-tag" data-face-id={face.id}>
      {moved && <line className="face-leader" x1={leaderX} y1={leaderFromY} x2={x + w / 2} y2={leaderToY} />}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={color} strokeWidth="2" strokeOpacity=".95" />
      <path d={`M${x} ${y + 14}V${y}h14 M${x + w - 14} ${y}h14v14 M${x} ${y + h - 14}v14h14 M${x + w - 14} ${y + h}h14v-14`} stroke={color} strokeWidth="3" fill="none" />
      <rect x={chipX} y={chipY} width={CHIP_W} height={CHIP_H} rx="4" fill="#202321f2" stroke={color} strokeWidth="1" />
      <circle cx={chipX + 14} cy={chipY + CHIP_H / 2} r="5" fill={color} />
      <text x={chipX + 27} y={chipY + 17} fill="#F7F3EB" fontSize="24" fontFamily="DM Sans, sans-serif" fontWeight="600">{face.id}</text>
      <text x={chipX + 27} y={chipY + 33} fill="#B9B4A8" fontSize="18" fontFamily="DM Sans, sans-serif">{face.isConfirmed ? 'CONFIRMED' : 'PENDING'} · {Math.round(face.confidence * 100)}%</text>
      <text x={chipX + CHIP_W - 10} y={chipY + 25} textAnchor="end" fill={color} fontSize="19" fontFamily="DM Sans, sans-serif">{face.isConfirmed ? 'ID' : '~'}</text>
    </g>
  );
}

export default function FaceOverlay({ timeline, currentTimeMs, showDetections, showTrails, showLabels = true, showEmpty = true }: Props) {
  if (!timeline) return null;
  const faces = facesAt(timeline, currentTimeMs);
  const chips = showDetections && showLabels ? layoutChips(faces) : [];
  const trails = showTrails
    ? faces.map(face => ({ id: face.id, points: trailsFor(timeline, face.id, currentTimeMs) })).filter(item => item.points)
    : [];
  return (
    <svg className="face-overlay" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-label="Real face detections synced to the video timeline">
      {showTrails && trails.map(trail => <polyline key={`trail-${trail.id}`} points={trail.points} fill="none" stroke="#B89A61" strokeWidth="2" strokeDasharray="4 4" opacity=".7" />)}
      {showDetections && faces.map(face => <FaceBox key={`box-${face.id}`} face={face} />)}
      {chips.map(chip => <FaceTag key={chip.face.id} chip={chip} />)}
      {!faces.length && showEmpty && <g>
        <rect x="486" y="326" width="308" height="44" rx="4" fill="#191917d9" stroke="#ffffff22" />
        <text x="640" y="354" textAnchor="middle" fill="#E8E4D9" fontSize="22" fontFamily="DM Sans, sans-serif">No face detected in this frame</text>
      </g>}
    </svg>
  );
}
