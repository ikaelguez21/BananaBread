import { type CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { MissingPrereq, PlannerCourse } from '../types';

interface CourseCardProps {
  course: PlannerCourse;
  error?: string;
  missingPrereqs?: MissingPrereq[];
  blockCount: number;
  onToggleComplete: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onViewDetails: (courseId: string) => void;
  onFocus: (courseId: string | null) => void;
  onAddPrereq: (missingId: string) => void;
}

export default function CourseCard({
  course,
  error,
  missingPrereqs = [],
  blockCount,
  onToggleComplete,
  onDelete,
  onViewDetails,
  onFocus,
  onAddPrereq
}: CourseCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `course-${course.id}`,
    data: { courseId: course.id }
  });

  const missingTooltip = missingPrereqs.length
    ? missingPrereqs.map((missing) => `${missing.name}`).join('\n')
    : undefined;

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
        <h4 title={course.name}>{course.name}</h4>
        <span className="badge course-id-badge" title={course.name}>{course.id}</span>
        <span className="badge small-badge">{course.credits} נק׳</span>
      </div>
      <p className="badge faculty-badge">{course.faculty}</p>
      {error ? (
        <div className="error-pill">
          {error}
          {missingPrereqs.length > 0 ? (
            <button
              type="button"
              className="missing-tooltip-button"
              onClick={() => onAddPrereq(missingPrereqs[0].id)}
              data-tooltip={missingTooltip}
              title={missingTooltip}
              aria-label={`הוסף ${missingPrereqs[0].id}`}
            >
              {missingPrereqs.length}
              <span className="missing-tooltip-icon">+</span>
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="course-actions">
        <button
          className="icon-button"
          type="button"
          title="פרטים"
          onClick={() => onViewDetails(course.id)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M12 8v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 16h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          className="icon-button"
          type="button"
          title={course.completed ? 'בטל הושלמה' : 'סמן הושלמה'}
          onClick={() => onToggleComplete(course.id)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          className="icon-button danger"
          type="button"
          title="הסר"
          onClick={() => onDelete(course.id)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M3 6h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 6V4h8v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M10 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 11v6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M5 6l1 14h12l1-14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {blockCount > 0 ? <span className="badge">חוסם {blockCount} קורסים</span> : null}
    </article>
  );
}
