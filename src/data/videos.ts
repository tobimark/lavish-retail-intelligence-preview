import type { DatasetId } from './overview';

export type VideoSource = {
  videoUrl: string;
  timelineUrl: string;
  metricsUrl: string;
  clipTitle: string;
  surfaceLabel: string;
  sampleLabel: string;
  durationFallback: number;
  confirmedUv: number;
};

export const videoSources: Record<DatasetId, VideoSource> = {
  concept: {
    videoUrl: '/demo/lavish-mall.mp4',
    timelineUrl: '/demo/face_uv_timeline.json',
    metricsUrl: '/demo/face_uv_metrics.json',
    clipTitle: 'Sample mall clip · real face-model replay',
    surfaceLabel: 'SAMPLE MALL FOOTAGE',
    sampleLabel: 'SAMPLE MALL FOOTAGE · NOT A LAVISH STORE',
    durationFallback: 25.659,
    confirmedUv: 6,
  },
  alternate: {
    videoUrl: '/demo/lavish-mall-b.mp4',
    timelineUrl: '/demo/face_uv_b_timeline.json',
    metricsUrl: '/demo/face_uv_b_metrics.json',
    clipTitle: 'AI-generated store clip · real face-model replay',
    surfaceLabel: 'AI-GENERATED STORE FOOTAGE',
    sampleLabel: 'AI-GENERATED STORE FOOTAGE · NOT A LAVISH STORE',
    durationFallback: 10.042,
    confirmedUv: 4,
  },
};
