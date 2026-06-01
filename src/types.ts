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

export interface TrackEntry {
  track_name: string;
  semester: number;
  course_id: string;
}
