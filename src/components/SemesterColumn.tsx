import { useDroppable } from '@dnd-kit/core';
import CourseCard from './CourseCard';
import type { PlannerCourse } from '../types';

interface SemesterColumnProps {
  semester: number;
  courses: PlannerCourse[];
  blocksByCourse: Record<string, number>;
  onToggleComplete: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onFocusCourse: (courseId: string | null) => void;
  getCourseError: (course: PlannerCourse) => string | null;
}

export default function SemesterColumn({
  semester,
  courses,
  blocksByCourse,
  onToggleComplete,
  onDelete,
  onFocusCourse,
  getCourseError
}: SemesterColumnProps) {
  const droppableId = `semester-${semester}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });

  return (
    <section ref={setNodeRef} className={`semester-column ${isOver ? 'drag-over' : ''}`}>
      <div className="semester-header">
        <div>
          <h3>סמסטר {semester}</h3>
          <span className="badge">{courses.length} קורסים</span>
        </div>
        <span className="badge">{courses.reduce((acc, course) => acc + course.credits, 0)} נק'</span>
      </div>
      <div className="course-list">
        {courses.length > 0 ? (
          courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              error={getCourseError(course) ?? undefined}
              blockCount={blocksByCourse[course.id] ?? 0}
              onToggleComplete={onToggleComplete}
              onDelete={onDelete}
              onFocus={onFocusCourse}
            />
          ))
        ) : (
          <p style={{ color: '#475569' }}>גרור קורסים לכאן כדי לארגן את הסמסטר.</p>
        )}
      </div>
    </section>
  );
}
