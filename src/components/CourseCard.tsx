import { type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { PlannerCourse } from '../types';

interface CourseCardProps {
  course: PlannerCourse;
  error?: string;
  blockCount: number;
  onToggleComplete: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onFocus: (courseId: string | null) => void;
}

export default function CourseCard({
  course,
  error,
  blockCount,
  onToggleComplete,
  onDelete,
  onFocus
}: CourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `course-${course.id}`,
    data: { courseId: course.id }
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.55 : 1
  } as CSSProperties;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`course-card ${course.completed ? 'completed' : ''} ${error ? 'error' : ''}`}
      onMouseEnter={() => onFocus(course.id)}
      onMouseLeave={() => onFocus(null)}
      {...attributes}
      {...listeners}
    >
      <div className="course-meta">
        <strong>{course.name}</strong>
        <span className="badge">{course.id}</span>
        <span className="badge">{course.credits} נק׳</span>
      </div>
      <p className="badge">{course.faculty}</p>
      {error ? <div className="error-pill">{error}</div> : null}
      <div className="course-actions">
        <button className="button secondary" type="button" onClick={() => onToggleComplete(course.id)}>
          {course.completed ? 'בטל הושלמה' : 'סמן הושלמה'}
        </button>
        <button className="button secondary" type="button" onClick={() => onDelete(course.id)}>
          הסר
        </button>
      </div>
      {blockCount > 0 ? <span className="badge">חוסם {blockCount} קורסים</span> : null}
    </article>
  );
}
