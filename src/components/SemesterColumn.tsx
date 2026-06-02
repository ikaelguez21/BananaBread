import { useDroppable } from '@dnd-kit/core';
import CourseCard from './CourseCard';
import type { PlannerCourse, PrereqMeta } from '../types';

interface SemesterColumnProps {
  semester: number;
  courses: PlannerCourse[];
  blocksByCourse: Record<string, number>;
  maxCredits: number;
  onToggleComplete: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onViewDetails: (courseId: string) => void;
  getCoursePrereqMeta: (course: PlannerCourse) => PrereqMeta;
  onAddPrereq: (missingId: string, targetSemester: number) => void;
}

export default function SemesterColumn({
  semester,
  courses,
  blocksByCourse,
  maxCredits,
  onToggleComplete,
  onDelete,
  onViewDetails,
  getCoursePrereqMeta,
  onAddPrereq
}: SemesterColumnProps) {
  const droppableId = `semester-${semester}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const semesterCredits = courses.reduce((acc, course) => acc + course.credits, 0);
  const isOverloaded = semesterCredits > maxCredits;

  return (
    <section ref={setNodeRef} className={`semester-column ${isOver ? 'drag-over' : ''} ${isOverloaded ? 'overloaded' : ''}`}>
      <div className="semester-header">
        <div>
          <h3>סמסטר {semester}</h3>
          <span className="badge">{courses.length} קורסים</span>
        </div>
        <div className="semester-header-right">
          <span className="badge">{semesterCredits} נק'</span>
          {isOverloaded ? <span className="badge danger">{semesterCredits}/{maxCredits} נק׳</span> : null}
        </div>
      </div>
      <div className="course-list">
        {courses.length > 0 ? (
          courses.map((course) => {
            const prereqMeta = getCoursePrereqMeta(course);
            return (
              <CourseCard
                key={course.id}
                course={course}
                error={prereqMeta.error ?? undefined}
                missingPrereqs={prereqMeta.missingPrereqs}
                blockCount={blocksByCourse[course.id] ?? 0}
                onToggleComplete={onToggleComplete}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
                onFocus={() => undefined}
                onAddPrereq={(missingId) => onAddPrereq(missingId, Math.max(1, course.semester - 1))}
              />
            );
          })
        ) : (
          <p style={{ color: '#475569' }}>גרור קורסים לכאן כדי לארגן את הסמסטר.</p>
        )}
      </div>
    </section>
  );
}
