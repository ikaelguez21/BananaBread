import trackCatalog from '../data/trackCatalog.json';
import type { TrackEntry, TrackOption, RecommendedSchedule, TrackLoadResult, InfoFetcherResult } from '../types';
import { translateTrackName } from './trackTranslation';

const trackEntries = trackCatalog as TrackEntry[];

export function getStaticTrackOptions(): TrackOption[] {
  return Array.from(new Set(trackEntries.map((entry) => entry.track_name)))
    .map((trackName) => ({ id: trackName, label: translateTrackName(trackName) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'he'));
}

interface TrackLoader {
  getTrackOptions: () => TrackOption[];
  loadTrack: (trackId: string) => TrackLoadResult;
}

export function createStaticTrackLoader(): TrackLoader {
  return {
    getTrackOptions: getStaticTrackOptions,
    loadTrack: loadStaticTrack
  };
}

export function loadStaticTrack(trackId: string): TrackLoadResult {
  const semesterEntries = trackEntries.filter((entry) => entry.track_name === trackId);
  const scheduleMap = new Map<number, string[]>();

  semesterEntries.forEach((entry) => {
    const list = scheduleMap.get(entry.semester) ?? [];
    list.push(entry.course_id);
    scheduleMap.set(entry.semester, list);
  });

  const recommendedSchedule: RecommendedSchedule[] = Array.from(scheduleMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([semester, courseIds]) => ({ semester, courseIds }));

  const infoFetcherResult: InfoFetcherResult = {
    recommendedSchedule,
    source: 'static'
  };

  return { semesterEntries, infoFetcherResult };
}
