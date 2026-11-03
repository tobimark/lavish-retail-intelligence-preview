import { useLayoutEffect, useRef, useState } from 'react';

export type OverlayPoint = { x: number; y: number };

export type OverlayTrack = {
  id: string;
  confidence: number;
  direction: 'entry' | 'exit';
  box: { x: number; y: number; w: number; h: number };
  foot: OverlayPoint;
  history: string;
};

type Props = {
  viewBoxW: number;
  viewBoxH: number;
  overlay: boolean;
  trajectories: boolean;
  countingLine: { a: OverlayPoint; b: OverlayPoint };
  tracks: OverlayTrack[];
};

type PlacedLabel = {
  key: string;
  left: number;
  top: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
};

const TOP_INSET = 86;
const BOTTOM_INSET = 78;
const MARGIN = 8;
const GAP = 4;

/**
 * LV04 overlay presentation. The SVG geometry (detection boxes/trajectories/counting line) is the
 * unchanged LV03 geometry; only the text labels moved out of the scaled viewBox into an HTML layer so
 * their font size is a real CSS pixel size (13px in the compact preview, 14px in the workbench).
 * Labels are measured and collision-resolved in display pixels; nothing else is moved or scaled.
 */
export default function VideoOverlay({ viewBoxW, viewBoxH, overlay, trajectories, countingLine, tracks }: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [placed, setPlaced] = useState<PlacedLabel[]>([]);

  useLayoutEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size.width > 0 ? size.width / viewBoxW : 0;

  useLayoutEffect(() => {
    if (!overlay || !scale || !size.width || !size.height) { setPlaced([]); return; }
    const width = size.width, height = size.height;
    const obstacles: { left: number; top: number; right: number; bottom: number }[] = [];
    const result: PlacedLabel[] = [];
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
    const overlaps = (rect: { left: number; top: number; right: number; bottom: number }) =>
      obstacles.some(o => rect.left < o.right + GAP && rect.right > o.left - GAP && rect.top < o.bottom + GAP && rect.bottom > o.top - GAP);

    // The counting line label is part of the video information and is an obstacle for detection labels.
    const lineEl = labelRefs.current.get('__line');
    const lineAnchorX = (countingLine.a.x + (countingLine.b.x - countingLine.a.x) * 0.17) * scale;
    const lineAnchorY = (countingLine.a.y + (countingLine.b.y - countingLine.a.y) * 0.17) * scale;
    if (lineEl) {
      const w = lineEl.offsetWidth, h = lineEl.offsetHeight;
      const left = clamp(lineAnchorX - w / 2, MARGIN, width - MARGIN - w);
      // Keep the whole caption above the sloped line: use the highest line point under the caption,
      // not just the 17% anchor, so the dashed counting line is never covered.
      const lineYAt = (xUnit: number) => {
        const dx = countingLine.b.x - countingLine.a.x;
        const t = dx === 0 ? 0 : (xUnit - countingLine.a.x) / dx;
        return countingLine.a.y + (countingLine.b.y - countingLine.a.y) * Math.max(0, Math.min(1, t));
      };
      const spanTop = Math.min(lineYAt(left / scale), lineYAt((left + w / 2) / scale), lineYAt((left + w) / scale));
      const top = clamp(Math.min(lineAnchorY - h - 12, spanTop * scale - h - 10), MARGIN, height - BOTTOM_INSET - h);
      obstacles.push({ left, top, right: left + w, bottom: top + h });
      result.push({ key: '__line', left, top, width: w, height: h, anchorX: lineAnchorX, anchorY: lineAnchorY });
    }

    for (const track of tracks) {
      const el = labelRefs.current.get(track.id);
      if (!el) continue;
      const w = el.offsetWidth, h = el.offsetHeight;
      const boxLeft = track.box.x * scale;
      const boxTop = track.box.y * scale;
      const boxBottom = (track.box.y + track.box.h) * scale;
      const boxRight = (track.box.x + track.box.w) * scale;
      const boxCenterX = (track.box.x + track.box.w / 2) * scale;
      const maxLeft = width - MARGIN - w;
      const maxTop = height - BOTTOM_INSET - h;
      const left = clamp(boxLeft, MARGIN, maxLeft);
      const above = boxTop - h - 6;
      // Never cover the person's own detection box and never cover the counting line: candidates go
      // upward first (labels sit above the head), then below the box, and the nearest valid one wins.
      const candidates: number[] = [above];
      for (let k = 1; k <= 8; k++) candidates.push(above - k * (h + GAP));
      for (let k = 1; k <= 4; k++) candidates.push(boxBottom + 6 + (k - 1) * (h + GAP));
      const boxHits = (rect: { left: number; top: number; right: number; bottom: number }) =>
        rect.left < boxRight + 2 && rect.right > boxLeft - 2 && rect.top < boxBottom + 2 && rect.bottom > boxTop - 2;
      const lineHits = (rect: { left: number; top: number; right: number; bottom: number }) => {
        const ax = countingLine.a.x * scale, ay = countingLine.a.y * scale;
        const bx = countingLine.b.x * scale, by = countingLine.b.y * scale;
        for (let i = 0; i <= 80; i++) {
          const t = i / 80;
          const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
          if (x > rect.left + 2 && x < rect.right - 2 && y > rect.top + 2 && y < rect.bottom - 2) return true;
        }
        return false;
      };
      let top = clamp(above, TOP_INSET, maxTop);
      let resolved = false;
      for (const candidate of candidates) {
        const nextTop = clamp(candidate, TOP_INSET, maxTop);
        const rect = { left, top: nextTop, right: left + w, bottom: nextTop + h };
        if (overlaps(rect) || boxHits(rect) || lineHits(rect)) continue;
        top = nextTop; resolved = true; break;
      }
      if (!resolved) top = clamp(TOP_INSET + result.length * (h + GAP), TOP_INSET, maxTop);
      obstacles.push({ left, top, right: left + w, bottom: top + h });
      result.push({
        key: track.id, left, top, width: w, height: h,
        anchorX: clamp(boxCenterX, left + 6, left + w - 6),
        anchorY: top > boxTop ? boxTop : boxBottom,
      });
    }
    setPlaced(result);
  }, [overlay, scale, size.width, size.height, tracks, countingLine]);

  const byKey = new Map(placed.map(p => [p.key, p]));
  const register = (key: string) => (el: HTMLElement | null) => {
    if (el) labelRefs.current.set(key, el); else labelRefs.current.delete(key);
  };
  const labelStyle = (key: string) => {
    const p = byKey.get(key);
    return p ? { left: p.left, top: p.top } : { left: 0, top: 0, visibility: 'hidden' as const };
  };

  return <>
    <svg className="vision-overlay" viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} aria-label="Synthetic person detections and entrance counting line">
      {overlay && <g className="counting-line">
        <line x1={countingLine.a.x} y1={countingLine.a.y} x2={countingLine.b.x} y2={countingLine.b.y} stroke="#f4ddb4" strokeWidth="2" strokeDasharray="9 5" />
        <circle cx={countingLine.a.x} cy={countingLine.a.y} r="4" fill="#f4ddb4" /><circle cx={countingLine.b.x} cy={countingLine.b.y} r="4" fill="#f4ddb4" />
      </g>}
      {tracks.map(track => <g key={track.id}>
        {trajectories && <><polyline points={track.history} stroke={track.direction === 'entry' ? '#ccdfc1' : '#f1c4a9'} strokeWidth="1.7" fill="none" opacity=".85" /><circle cx={track.foot.x} cy={track.foot.y} r="3" fill={track.direction === 'entry' ? '#ccdfc1' : '#f1c4a9'} /></>}
        {overlay && <g data-track={track.id}>
          <rect x={track.box.x} y={track.box.y} width={track.box.w} height={track.box.h} fill="none" stroke={track.direction === 'entry' ? '#ccdfc1' : '#f1c4a9'} strokeWidth="1" strokeOpacity=".65" />
          <path d={`M${track.box.x} ${track.box.y + 10}V${track.box.y}h10 M${track.box.x + track.box.w - 10} ${track.box.y}h10v10 M${track.box.x} ${track.box.y + track.box.h - 10}v10h10 M${track.box.x + track.box.w - 10} ${track.box.y + track.box.h}h10v-10`} stroke={track.direction === 'entry' ? '#ccdfc1' : '#f1c4a9'} strokeWidth="2" fill="none" />
        </g>}
      </g>)}
      {overlay && placed.filter(p => p.key !== '__line').map(p => {
        const track = tracks.find(t => t.id === p.key);
        if (!track) return null;
        const labelAboveBox = p.top < track.box.y * scale;
        const fromY = (labelAboveBox ? p.top + p.height : p.top) / scale;
        const toY = labelAboveBox ? track.box.y : track.box.y + track.box.h;
        return <line key={`leader-${p.key}`} className="overlay-leader" x1={p.anchorX / scale} y1={fromY} x2={(track.box.x + track.box.w / 2)} y2={toY} />;
      })}
    </svg>
    <div className={`overlay-labels ${overlay ? '' : 'is-hidden'}`} ref={layerRef} aria-hidden={!overlay}>
      {overlay && <div className="video-label line-label" ref={register('__line')} style={labelStyle('__line')}>A · COUNTING LINE</div>}
      {overlay && tracks.map(track => <div key={track.id} className={`video-label scene-tag ${track.direction}`} ref={register(track.id)} style={labelStyle(track.id)} aria-label={`${track.id}, ${track.confidence} percent synthetic confidence, ${track.direction}`}>
        <span aria-hidden="true">{track.direction === 'entry' ? '↑' : '↓'}</span><strong>{track.id}</strong><span className="confidence">{track.confidence}%</span>
      </div>)}
    </div>
  </>;
}
