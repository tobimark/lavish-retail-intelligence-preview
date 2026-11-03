#!/usr/bin/env python3
"""LV05/Lavish recorded-video anonymous face-UV analysis.

Pipeline: OpenCV YuNet face detection -> SFace embeddings -> temporal/spatial identity
association -> cross-frame anonymous deduplication.  Outputs only anonymous IDs, boxes,
timestamps and aggregate statistics; no face crops, embeddings or identities are written.

Run:
  python scripts/analyze_lavish_video.py --video public/demo/lavish-mall.mp4 \
      --models scripts/models --output public/demo

Model sources (downloaded manually from the official OpenCV Zoo mirrors, SHA256 recorded):
  YuNet 2023mar  https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
  SFace 2021dec  https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx
"""
import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

MODEL_FILES = {
    'face_detection_yunet_2023mar.onnx': {
        'role': 'detection',
        'min_bytes': 100_000,
        'url': 'https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx',
    },
    'face_recognition_sface_2021dec.onnx': {
        'role': 'identity',
        'min_bytes': 1_000_000,
        'url': 'https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx',
    },
}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest().upper()


def l2(v):
    v = np.asarray(v, dtype=np.float32).reshape(-1)
    return v / max(1e-9, float(np.linalg.norm(v)))


def load_models(folder):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    info = {}
    for name, meta in MODEL_FILES.items():
        target = folder / name
        if not target.exists() or target.stat().st_size < meta['min_bytes']:
            raise FileNotFoundError(
                f'{target} is missing/incomplete. Download it from {meta["url"]} '
                f'and place it in {folder}. A Git LFS pointer or HTML file is not a valid model.')
        info[name] = {'role': meta['role'], 'bytes': target.stat().st_size, 'sha256': sha256(target), 'source': meta['url']}
    yunet = str(folder / 'face_detection_yunet_2023mar.onnx')
    sface = str(folder / 'face_recognition_sface_2021dec.onnx')
    return yunet, sface, info


def analyze(args):
    source = Path(args.video)
    if not source.is_file():
        raise FileNotFoundError(source)
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    yunet_path, sface_path, model_info = load_models(args.models)

    cap = cv2.VideoCapture(str(source))
    if not cap.isOpened():
        raise RuntimeError(f'Could not open video: {source}')
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    detector = cv2.FaceDetectorYN.create(yunet_path, '', (width, height), args.detection_threshold, 0.3, 5000)
    recognizer = cv2.FaceRecognizerSF.create(sface_path, '')
    stride = max(1, round(fps / args.sample_fps))

    identities = []           # internal embeddings stay in memory only
    frames = []              # public per-sample observations
    frame_index = 0
    sampled = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_index % stride:
            frame_index += 1
            continue
        timestamp_ms = round(frame_index * 1000.0 / fps)
        faces = detector.detect(frame)[1]
        hits = []
        assigned = set()
        if faces is not None:
            ordered = sorted(faces, key=lambda f: -float(f[-1]))
            for face in ordered:
                x, y, w, h = [float(v) for v in face[:4]]
                if min(w, h) < args.min_face_px:
                    continue
                if x < 0 or y < 0 or x + w > width or y + h > height:
                    continue
                try:
                    aligned = recognizer.alignCrop(frame, face)
                    emb = l2(recognizer.feature(aligned))
                except cv2.error:
                    continue
                if not np.isfinite(emb).all():
                    continue
                center = np.array([x + w / 2, y + h / 2])
                size = float(np.linalg.norm([w, h]))
                score = float(face[-1])
                best_id = None
                best_rank = -1e9
                best_sim = None
                for item in identities:
                    if item['id'] in assigned:
                        continue
                    sim = float(np.dot(emb, l2(np.mean(item['embs'], axis=0))))
                    age = timestamp_ms / 1000.0 - item['last_ms'] / 1000.0
                    spatial = float(np.linalg.norm(center - item['center'])) / max(size, 45.0)
                    local = age <= args.local_max_gap and spatial < args.local_max_distance and sim >= args.local_similarity
                    reid = sim >= args.similarity
                    if not (local or reid):
                        continue
                    rank = sim + (0.09 if local else 0.0)
                    if rank > best_rank:
                        best_rank = rank
                        best_id = item['id']
                        best_sim = sim
                if best_id is None:
                    best_id = len(identities) + 1
                    identities.append({'id': best_id, 'first_ms': timestamp_ms, 'last_ms': timestamp_ms, 'hits': 0,
                                       'embs': [], 'center': center, 'max_face': 0.0, 'scores': [], 'matches': []})
                person = identities[best_id - 1]
                person['hits'] += 1
                person['last_ms'] = timestamp_ms
                person['center'] = center
                person['max_face'] = max(person['max_face'], min(w, h))
                person['scores'].append(score)
                if best_sim is not None:
                    person['matches'].append(best_sim)
                if score > 0.90 or len(person['embs']) < 5:
                    person['embs'].append(emb)
                    person['embs'] = person['embs'][-12:]
                assigned.add(best_id)
                quality = min(1.0, min(w, h) / 110.0)
                hits.append({
                    'anonymous_person_id': f'ANON-{best_id:03d}',
                    'track_index': best_id,
                    'bbox': [round(x, 1), round(y, 1), round(w, 1), round(h, 1)],
                    'detection_confidence': round(score, 3),
                    'matching_confidence': None if best_sim is None else round(best_sim, 3),
                    'face_quality': round(quality, 3),
                })
        frames.append({'video_time_ms': timestamp_ms, 'faces': hits})
        sample_index = len(frames)
        if sample_index % 50 == 0:
            print(f'processed {timestamp_ms / 1000:.1f}s / {duration:.1f}s; candidates={len(identities)}', flush=True)
        frame_index += 1
        sampled += 1
    cap.release()

    # Confirmation requires repeated, stable observation (not a single-frame detection).
    confirmed = [p for p in identities if p['hits'] >= args.min_hits and
                 (p['last_ms'] - p['first_ms']) / 1000.0 >= args.min_duration and
                 p['max_face'] >= args.min_face_px]
    confirmed_id = {p['id'] for p in confirmed}
    confirmed_at_ms = {}
    seen = Counter()
    for fr in frames:
        for face in fr['faces']:
            pid = face['track_index']
            if pid in confirmed_id and pid not in confirmed_at_ms:
                seen[pid] += 1
                if seen[pid] >= args.min_hits:
                    confirmed_at_ms[pid] = fr['video_time_ms']
    for fr in frames:
        for face in fr['faces']:
            pid = face['track_index']
            face['anonymous_person_id'] = f'ANON-{pid:03d}'
            face['is_confirmed'] = pid in confirmed_id
            face['confirmed_at_ms'] = confirmed_at_ms.get(pid)
        confirmed_so_far = {pid for pid, t in confirmed_at_ms.items() if t <= fr['video_time_ms']}
        fr['detected_faces_now'] = len(fr['faces'])
        fr['confirmed_uv_so_far'] = len(confirmed_so_far)
        fr['new_identity_event'] = any(t == fr['video_time_ms'] for t in confirmed_at_ms.values())

    events = []
    for pid, at_ms in sorted(confirmed_at_ms.items()):
        person = identities[pid - 1]
        events.append({
            'video_time_ms': at_ms,
            'anonymous_person_id': f'ANON-{pid:03d}',
            'evidence': 'repeated YuNet detection + SFace appearance match',
            'hits_at_confirmation': args.min_hits,
            'avg_detection_confidence': round(float(np.mean(person['scores'])), 3),
            'max_face_px': round(person['max_face']),
        })

    # Audit helpers: pairwise max embedding similarity between confirmed identities (not persisted).
    confirmed_list = [p for p in confirmed]
    pairwise = []
    for i, a in enumerate(confirmed_list):
        for b in confirmed_list[i + 1:]:
            sim = float(np.dot(l2(np.mean(a['embs'], axis=0)), l2(np.mean(b['embs'], axis=0))))
            if sim >= 0.30:
                pairwise.append({'a': f'ANON-{a["id"]:03d}', 'b': f'ANON-{b["id"]:03d}', 'cosine_similarity': round(sim, 3)})

    qc = {
        'sample_times_sec': [1, 3, 5, 10, 12, 14, 16, 18, 20, 24],
        'detections_with_face': sum(1 for fr in frames if fr['faces']),
        'total_samples': len(frames),
        'single_frame_tracklets_excluded': len(identities) - len(confirmed),
        'pairwise_confirmed_similarity_over_0.30': sorted(pairwise, key=lambda x: -x['cosine_similarity'])[:10],
    }
    metrics = {
        'schema_version': 'lv05.face_uv.v1',
        'source_video': source.name,
        'video': {
            'width': width, 'height': height, 'fps': round(fps, 3),
            'duration_seconds': round(duration, 2), 'duration_ms': round(duration * 1000),
            'total_frames': total_frames,
        },
        'bbox_format': 'pixel_xywh_in_source_video',
        'time_format': 'video_time_ms from the source video timeline',
        'models': model_info,
        'pipeline': {
            'detection': 'OpenCV YuNet 2023mar',
            'identity': 'OpenCV SFace 2021dec (128-d cosine embeddings)',
            'association': 'per-frame greedy matching with local temporal/spatial gating and cross-time cosine re-identification; one identity per face per frame',
            'deduplication': 'anonymous identities are created only when no existing identity matches; a confirmed identity is counted once at its confirmation time and never incremented again',
            'confirmation_rule': f">= {args.min_hits} samples and >= {args.min_duration}s stable presence and face >= {args.min_face_px}px",
        },
        'parameters': {
            'sample_rate_fps': round(fps / stride, 3),
            'detection_threshold': args.detection_threshold,
            'min_face_px': args.min_face_px,
            'recognition_cosine_threshold': args.similarity,
            'local_similarity': args.local_similarity,
            'local_max_gap_seconds': args.local_max_gap,
            'local_max_distance_ratio': args.local_max_distance,
            'min_hits': args.min_hits,
            'min_duration_seconds': args.min_duration,
        },
        'counts': {
            'candidate_identities': len(identities),
            'confirmed_recognizable_face_uv': len(confirmed),
            'excluded_low_support_tracklets': len(identities) - len(confirmed),
            'confirmed_identity_events': len(events),
            'max_detected_faces_in_one_frame': max((fr['detected_faces_now'] for fr in frames), default=0),
        },
        'metric_definition': 'Recognizable Face UV = number of anonymous face identities with repeated stable observations in this clip. It is NOT all people in frame, NOT store entrance UV, NOT unique customers (UC), and NOT cross-store re-identification.',
        'quality_control': qc,
        'identities': [{
            'anonymous_person_id': f'ANON-{p["id"]:03d}',
            'first_ms': p['first_ms'], 'last_ms': p['last_ms'],
            'observed_samples': p['hits'],
            'max_face_px': round(p['max_face'], 1),
            'avg_detection_confidence': round(float(np.mean(p['scores'])), 3),
            'avg_matching_confidence': round(float(np.mean(p['matches'])), 3) if p['matches'] else None,
            'confirmed': p['id'] in confirmed_id,
            'confirmed_at_ms': confirmed_at_ms.get(p['id']),
        } for p in identities],
        'events': events,
        'limitations': [
            'Only front-visible / sufficiently large faces are detectable; turned-away, distant or occluded people are missed.',
            'One person can be split into two anonymous IDs if appearance changes strongly; low-support tracklets are excluded from UV.',
            'No face images, embeddings or real identities are exported; the JSON contains anonymous IDs, boxes and aggregate statistics only.',
            'The footage is an unspecified shopping mall clip, not a Lavish store; results are analysis replay, not live monitoring.',
        ],
        'privacy': 'Only anonymous IDs, face boxes, timestamps and aggregate statistics are written. No biometric templates, crops or personal data are persisted.',
    }
    (out / 'face_uv_timeline.json').write_text(json.dumps({'video_time_ms': frames[-1]['video_time_ms'] if frames else 0, 'duration_ms': metrics['video']['duration_ms'], 'frames': frames}, indent=2, ensure_ascii=False), encoding='utf-8')
    (out / 'face_uv_metrics.json').write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding='utf-8')
    print('\nFACE UV ANALYSIS FINISHED')
    print(json.dumps({'candidate_identities': len(identities), 'confirmed_recognizable_face_uv': len(confirmed),
                      'excluded_low_support_tracklets': len(identities) - len(confirmed),
                      'events': len(events)}, indent=2))
    print('outputs:', out / 'face_uv_metrics.json', out / 'face_uv_timeline.json')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Recorded-video anonymous face-UV analysis (YuNet + SFace).')
    ap.add_argument('--video', required=True)
    ap.add_argument('--output', default='public/demo')
    ap.add_argument('--models', default='scripts/models')
    ap.add_argument('--sample-fps', type=float, default=10.0)
    ap.add_argument('--min-face-px', type=float, default=44.0)
    ap.add_argument('--detection-threshold', type=float, default=0.88)
    ap.add_argument('--similarity', type=float, default=0.45)
    ap.add_argument('--local-similarity', type=float, default=0.30)
    ap.add_argument('--local-max-gap', type=float, default=1.0)
    ap.add_argument('--local-max-distance', type=float, default=1.2)
    ap.add_argument('--min-hits', type=int, default=4)
    ap.add_argument('--min-duration', type=float, default=0.6)
    try:
        analyze(ap.parse_args())
    except Exception as exc:
        sys.exit(f'ERROR: {exc}')
