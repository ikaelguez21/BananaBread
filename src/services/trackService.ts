import trackCatalog from '../data/trackCatalog.json';
import mergedTrackJson from '../data/tracks-latest.json';
import type { TrackEntry, TrackOption, RecommendedSchedule, TrackLoadResult, InfoFetcherResult } from '../types';
import { translateTrackName } from './trackTranslation';

const trackEntries = trackCatalog as TrackEntry[];
const mergedTrackData = mergedTrackJson as Record<string, unknown>;

export function getStaticTrackOptions(): TrackOption[] {
  return Array.from(new Set(trackEntries.map((entry) => entry.track_name)))
    .map((trackName) => ({ id: trackName, label: translateTrackName(trackName) }))
    .sort((left, right) => left.label.localeCompare(right.label, 'he'));
}

function normalizeTrackId(value?: string): string {
  return typeof value === 'string' ? value.trim() : 'unknown';
}

function extractCourseId(course: unknown): string | null {
  if (typeof course === 'string') {
    return course.trim() || null;
  }
  if (typeof course === 'object' && course !== null) {
    const record = course as Record<string, unknown>;
    const idValue = record.courseId ?? record.course_id ?? record.id;
    if (typeof idValue === 'string' && idValue.trim()) {
      return idValue.trim();
    }
  }
  return null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^א-תa-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function buildMergedTrackEntries(source: Record<string, unknown>): TrackEntry[] {
  const entries: TrackEntry[] = [];
  const faculties = Array.isArray(source.faculties) ? source.faculties : [];

  faculties.forEach((facultyRaw) => {
    if (typeof facultyRaw !== 'object' || facultyRaw === null) return;
    const faculty = facultyRaw as Record<string, unknown>;
    const facultyName = normalizeTrackId(faculty.name as string | undefined) || 'לא ידוע';
    const facultyId = normalizeTrackId(faculty.id as string | undefined) || slugify(facultyName);
    const programs = Array.isArray(faculty.programs) ? faculty.programs : [];

    programs.forEach((programRaw) => {
      if (typeof programRaw !== 'object' || programRaw === null) return;
      const program = programRaw as Record<string, unknown>;
      const programName = normalizeTrackId(program.name as string | undefined) || 'לא ידוע';
      const programId = normalizeTrackId(program.id as string | undefined) || slugify(programName);
      const specializations = Array.isArray(program.specializations) ? program.specializations : [];

      specializations.forEach((specRaw) => {
        if (typeof specRaw !== 'object' || specRaw === null) return;
        const specialization = specRaw as Record<string, unknown>;
        const specializationName = normalizeTrackId(specialization.name as string | undefined);
        const specializationId = normalizeTrackId(specialization.id as string | undefined) || slugify(`${programName}-${specializationName}`);
        const trackId = `${facultyId}:${programId}:${specializationId}`;

        const recommendedPlan = Array.isArray(specialization.recommendedPlan) ? specialization.recommendedPlan : [];
        recommendedPlan.forEach((planRaw) => {
          if (typeof planRaw !== 'object' || planRaw === null) return;
          const plan = planRaw as Record<string, unknown>;
          const semester = Number(plan.semester) || 0;
          const courses = Array.isArray(plan.courses) ? plan.courses : [];

          courses.forEach((courseRaw) => {
            const courseId = extractCourseId(courseRaw);
            if (courseId) {
              entries.push({ track_name: trackId, semester, course_id: courseId });
            }
          });
        });
      });
    });
  });

  return entries;
}

function buildMergedTrackOptions(source: Record<string, unknown>): TrackOption[] {
  const options: TrackOption[] = [];
  const seen = new Set<string>();
  const faculties = Array.isArray(source.faculties) ? source.faculties : [];

  faculties.forEach((facultyRaw) => {
    if (typeof facultyRaw !== 'object' || facultyRaw === null) return;
    const faculty = facultyRaw as Record<string, unknown>;
    const facultyName = normalizeTrackId(faculty.name as string | undefined) || 'לא ידוע';
    const facultyId = normalizeTrackId(faculty.id as string | undefined) || slugify(facultyName);
    const programs = Array.isArray(faculty.programs) ? faculty.programs : [];

    programs.forEach((programRaw) => {
      if (typeof programRaw !== 'object' || programRaw === null) return;
      const program = programRaw as Record<string, unknown>;
      const programName = normalizeTrackId(program.name as string | undefined) || 'לא ידוע';
      const programId = normalizeTrackId(program.id as string | undefined) || slugify(programName);
      const specializations = Array.isArray(program.specializations) ? program.specializations : [];

      specializations.forEach((specRaw) => {
        if (typeof specRaw !== 'object' || specRaw === null) return;
        const specialization = specRaw as Record<string, unknown>;
        const specializationName = normalizeTrackId(specialization.name as string | undefined);
        const specializationId = normalizeTrackId(specialization.id as string | undefined) || slugify(`${programName}-${specializationName}`);
        const trackId = `${facultyId}:${programId}:${specializationId}`;
        const label = [facultyName, programName, specializationName].filter(Boolean).join(' / ');

        if (!seen.has(trackId)) {
          seen.add(trackId);
          options.push({ id: trackId, label: label || trackId });
        }
      });
    });
  });

  return options.sort((left, right) => left.label.localeCompare(right.label, 'he'));
}

interface TrackLoader {
  getTrackOptions: () => TrackOption[];
  loadTrack: (trackId: string) => TrackLoadResult;
}

function createTrackLoader(entries: TrackEntry[], options: TrackOption[], source: InfoFetcherResult['source']): TrackLoader {
  return {
    getTrackOptions: () => options,
    loadTrack: (trackId: string) => {
      const semesterEntries = entries.filter((entry) => entry.track_name === trackId);
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
        source,
      };

      return { semesterEntries, infoFetcherResult };
    },
  };
}

export function createStaticTrackLoader(): TrackLoader {
  return createTrackLoader(trackEntries, getStaticTrackOptions(), 'static');
}

export function createMergedTrackLoader(): TrackLoader {
  const mergedEntries = buildMergedTrackEntries(mergedTrackData);
  const mergedOptions = buildMergedTrackOptions(mergedTrackData);
  return mergedEntries.length ? createTrackLoader(mergedEntries, mergedOptions, 'merged') : createStaticTrackLoader();
}

export function loadStaticTrack(trackId: string): TrackLoadResult {
  return createStaticTrackLoader().loadTrack(trackId);
}
