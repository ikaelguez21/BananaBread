export interface Course {
  id: string;
  name: string;
  faculty: string;
  credits: number;
  prereqString: string;
  prereqs: string[];
}

export interface PlannerCourse extends Course {
  semester: number;
  completed: boolean;
}

export interface MissingPrereq {
  id: string;
  name: string;
}

export interface PrereqMeta {
  error: string | null;
  missingPrereqs: MissingPrereq[];
}

export interface TrackOption {
  id: string;
  label: string;
}

export interface RecommendedSchedule {
  semester: number;
  courseIds: string[];
}

export interface InfoFetcherResult {
  recommendedSchedule: RecommendedSchedule[];
  source: 'static' | 'info-fetcher' | 'merged';
  warnings?: string[];
}

export interface TrackLoadResult {
  semesterEntries: TrackEntry[];
  infoFetcherResult: InfoFetcherResult;
}

export type RequirementGroupKind = 'mandatory' | 'mandatory_elective' | 'elective';

export interface RequirementGroup {
  id: string;
  label: string;
  kind?: RequirementGroupKind;
  courses: string[];
}

export interface TrackEntry {
  track_name: string;
  semester: number;
  course_id: string;
}
