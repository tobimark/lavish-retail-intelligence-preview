import { useEffect, useRef, useState } from 'react';
import { Activity, Eye, EyeOff, Fingerprint, Maximize2, Pause, Play, Repeat, RotateCcw, ShieldCheck, X } from 'lucide-react';
import FaceOverlay from './FaceOverlay';
import {
  confirmedEventsAt, confirmedUvAt, facesAt, formatVideoTime, loadVideoAnalysis,
  type IdentityEvent, type VideoMetrics, type VideoTimeline,
} from './videoAnalytics';
import { videoSources } from '../../data/videos';
import type { DatasetId } from '../../data/overview';

type Props = { expanded: boolean; onExpand: () => void; onClose: () => void; datasetId: DatasetId };
type Analysis = { timeline: VideoTimeline; metrics: VideoMetrics };

export default function LiveVisionModule({ expanded, onExpand, onClose, datasetId }: Props) {
  const [analyses, setAnalyses] = useState<Partial<Record<DatasetId, Analysis>>>({});
  const [error, setError] = useState('');
  const [time, setTime] = useState(0);
  const source = videoSources[datasetId];
  const [duration, setDuration] = useState(source.durationFallback);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [rate, setRate] = useState(1);
  const [detections, setDetections] = useState(true);
  const [trails, setTrails] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const raf = useRef(0);
  const previousDataset = useRef<DatasetId>(datasetId);
  const analysis = analyses[datasetId] ?? null;

  useEffect(() => {
    let cancelled = false;
    Promise.all((Object.keys(videoSources) as DatasetId[]).map(id =>
      loadVideoAnalysis(videoSources[id]).then(data => [id, data] as const)))
      .then(entries => { if (!cancelled) setAnalyses(Object.fromEntries(entries) as Partial<Record<DatasetId, Analysis>>); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Analysis data failed to load.'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setTime(video.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoaded = () => { if (Number.isFinite(video.duration)) setDuration(video.duration); sync(); };
    video.addEventListener('timeupdate', sync);
    video.addEventListener('seeked', sync);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('loadedmetadata', onLoaded);
    return () => {
      video.removeEventListener('timeupdate', sync);
      video.removeEventListener('seeked', sync);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('loadedmetadata', onLoaded);
    };
  }, []);

  // A/B changes the clip and its model timeline. Keep one <video>; start the new clip at 0.
  useEffect(() => {
    setTime(0);
    setDuration(source.durationFallback);
    if (previousDataset.current === datasetId) return;
    previousDataset.current = datasetId;
    const video = videoRef.current;
    if (video) {
      video.load();
      video.currentTime = 0;
      video.play().catch(() => {});
    }
  }, [datasetId, source.durationFallback]);

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      if (videoRef.current) setTime(videoRef.current.currentTime);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [expanded, onClose]);

  const uv = confirmedUvAt(analysis?.metrics ?? null, Math.round(time * 1000));
  const events = confirmedEventsAt(analysis?.metrics ?? null, Math.round(time * 1000));
  const faces = facesAt(analysis?.timeline ?? null, Math.round(time * 1000));
  const totalUv = analysis?.metrics.counts.confirmed_recognizable_face_uv ?? source.confirmedUv;
  const durationMs = duration * 1000;

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setError('Playback was blocked by the browser.'));
    else video.pause();
  };
  const seek = (ms: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(duration, ms / 1000));
    setTime(video.currentTime);
  };
  const changeRate = (value: number) => {
    if (videoRef.current) videoRef.current.playbackRate = value;
    setRate(value);
  };
  const toggleLoop = () => {
    const next = !loop;
    if (videoRef.current) videoRef.current.loop = next;
    setLoop(next);
  };
  const restart = () => {
    const video = videoRef.current;
    if (video) { video.pause(); video.currentTime = 0; }
    setTime(0);
  };
  const seekEvent = (event: IdentityEvent) => seek(event.video_time_ms);

  return <div className={`lv-module ${expanded ? 'is-open' : ''}`}>
    {expanded && <div className="lv-backdrop" onClick={onClose} />}
    <section className="card camera-card lv-card" role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label="Recorded video analysis" aria-labelledby="lv-title">
      <div className="card-head lv-head">
        <div>
          {expanded && <div className="lv-eyebrow">LAVISH / LIVE VISION</div>}
          <h2 id="lv-title">{expanded ? 'Recorded analysis replay' : 'Live Vision'}</h2>
          <div className="card-sub">{expanded ? `${source.clipTitle} · not live CCTV` : source.clipTitle}</div>
        </div>
        <div className="lv-head-actions">
          <span className="cam-meta"><i className="cam-live-dot" /> REPLAY</span>
          {expanded
            ? <button ref={closeRef} className="lv-close" onClick={onClose} aria-label="Close Live Vision workspace"><X size={18} /></button>
            : <button className="tiny-btn lv-expand" onClick={onExpand} aria-label="Expand Live Vision workspace" title="Expand Live Vision"><Maximize2 size={15} /></button>}
        </div>
      </div>

      <div className={`lv-main ${expanded ? 'expanded' : ''}`}>
        <div className="lv-screen" onClick={expanded ? undefined : onExpand} role={expanded ? undefined : 'button'} tabIndex={expanded ? undefined : 0} onKeyDown={event => { if (!expanded && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onExpand(); } }} aria-label={expanded ? undefined : 'Open recorded Live Vision analysis'}>
          <video ref={videoRef} className="lv-video" src={source.videoUrl} muted autoPlay playsInline loop={loop} preload="auto" onClick={event => { event.stopPropagation(); if (expanded) toggle(); }} />
          <FaceOverlay timeline={analysis?.timeline ?? null} currentTimeMs={Math.round(time * 1000)} showDetections={detections} showTrails={expanded && trails} showLabels={expanded} showEmpty={expanded} />
          <div className="lv-hud-top">
            {expanded ? <>
              <span className="lv-recorded"><i />RECORDED DEMO / ANALYSIS REPLAY · DATASET {datasetId === 'concept' ? 'A' : 'B'}</span>
              <span className="lv-sample">{source.sampleLabel}</span>
            </> : <span className="lv-recorded compact"><i />RECORDED DEMO · {datasetId === 'concept' ? 'A' : 'B'}</span>}
          </div>
          <div className="lv-hud-bottom">
            <span className="lv-hud-stat"><small>FACE UV</small><strong>{String(uv).padStart(2, '0')}</strong></span>
            {expanded && <span className="lv-hud-stat"><small>FACES NOW</small><strong>{String(faces.length).padStart(2, '0')}</strong></span>}
            <span className="lv-clock">{formatVideoTime(time)}{expanded && <span> / {formatVideoTime(duration)}</span>}</span>
          </div>
          {!analysis && !error && <div className="lv-state"><Activity size={20} />Loading model analysis…</div>}
          {error && <div className="lv-state error"><ShieldCheck size={20} />{error}</div>}
        </div>

        {expanded && <aside className="lv-events" aria-label="Identity events">
          <div className="lv-events-head"><span>IDENTITY EVENTS</span><span>{String(events.length).padStart(2, '0')} / {String(totalUv).padStart(2, '0')}</span></div>
          <div className="lv-events-sub"><ShieldCheck size={13} />Rebuilt from video time · anonymous IDs only</div>
          <div className="lv-event-list">
            {events.length ? [...events].reverse().map(event => <button key={event.anonymous_person_id} className="lv-event" onClick={() => seekEvent(event)}>
              <span className="lv-event-icon"><Fingerprint size={16} /></span>
              <span className="lv-event-copy"><b>New identity confirmed</b><span>{event.anonymous_person_id} · {Math.round(event.avg_detection_confidence * 100)}% · {formatVideoTime(event.video_time_ms / 1000)}</span></span>
            </button>) : <div className="lv-events-empty"><Fingerprint size={24} /><b>No confirmed identity yet.</b><p>Seek forward; the confirmed Face UV set is rebuilt from the model timeline.</p></div>}
          </div>
          <div className="lv-foot-note"><ShieldCheck size={13} />{totalUv} confirmed in clip · not store UV/UC · no biometric templates stored</div>
        </aside>}
      </div>

      {!expanded && <div className="cam-foot lv-foot">
        <span><ShieldCheck size={14} /><span className="good">{String(uv).padStart(2, '0')} Face UV</span> · not store UV</span>
        <button onClick={onExpand}>View camera <span>→</span></button>
      </div>}

      {expanded && <div className="lv-controls">
        <div className="lv-timeline-row">
          <span>{formatVideoTime(time)}</span>
          <div className="lv-timeline">
            <div className="lv-ticks" aria-hidden="true">{analysis?.metrics.events.map(event => <i key={event.anonymous_person_id} style={{ left: `${event.video_time_ms / durationMs * 100}%` }} />)}</div>
            <input aria-label="Video position" type="range" min="0" max={Math.round(durationMs)} step="10" value={Math.round(time * 1000)} onChange={event => seek(Number(event.target.value))} style={{ '--progress': `${time * 1000 / durationMs * 100}%` } as React.CSSProperties} />
          </div>
          <span>{formatVideoTime(duration)}</span>
        </div>
        <div className="lv-transport">
          <button className="lv-play" onClick={toggle} aria-label={playing ? 'Pause recorded video' : 'Play recorded video'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
          <span className="lv-play-state">{playing ? `Analysis playing · ${rate}×` : 'Analysis paused'}</span>
          <label className="lv-speed"><select aria-label="Playback speed" value={rate} onChange={event => changeRate(Number(event.target.value))}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select></label>
          <button className={`lv-icon ${loop ? 'on' : ''}`} onClick={toggleLoop} aria-pressed={loop} aria-label={loop ? 'Disable loop' : 'Enable loop'} title={loop ? 'Loop on' : 'Loop off'}><Repeat size={16} /></button>
          <button className="lv-icon" onClick={restart} aria-label="Restart video" title="Restart video"><RotateCcw size={16} /></button>
          <div className="lv-view-toggles">
            <button className={`lv-toggle ${detections ? 'on' : ''}`} onClick={() => setDetections(!detections)} aria-pressed={detections} aria-label="Show detection overlay">{detections ? <Eye size={15} /> : <EyeOff size={15} />}<span>Detection</span></button>
            <button className={`lv-toggle ${trails ? 'on' : ''}`} onClick={() => setTrails(!trails)} aria-pressed={trails} aria-label="Show motion trails"><Activity size={15} /><span>Trails</span></button>
          </div>
          <span className="lv-model-note">YUNET 2023MAR · SFACE 2021DEC · 10 FPS</span>
        </div>
      </div>}
    </section>
  </div>;
}
