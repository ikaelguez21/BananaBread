import { useEffect } from 'react';
import type { PlannerCourse, PrereqMeta } from '../types';

interface CourseDetailModalProps {
  open: boolean;
  course: PlannerCourse | null;
  prereqMeta: PrereqMeta | null;
  blockCount: number;
  onClose: () => void;
  onToggleComplete: (courseId: string) => void;
  onDelete: (courseId: string) => void;
  onAddPrereq: (missingId: string) => void;
}

export default function CourseDetailModal({
  open,
  course,
  prereqMeta,
  blockCount,
  onClose,
  onToggleComplete,
  onDelete,
  onAddPrereq
}: CourseDetailModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !course) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card detail-modal" onClick={(event) => event.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{course.name}</h2>
            <p className="muted">{course.id} · {course.faculty} · {course.credits} נק׳</p>
          </div>
          <button className="button secondary" type="button" onClick={onClose}>
            סגור
          </button>
        </div>

        <section className="detail-section">
          <h3>סטטוס</h3>
          <div className="detail-chips">
            <span className="badge">סמסטר {course.semester}</span>
            <span className="badge">{blockCount} קורסים חסומים</span>
            <span className="badge">{course.completed ? 'הושלם' : 'לא הושלם'}</span>
          </div>
        </section>

        {prereqMeta?.missingPrereqs.length ? (
          <section className="detail-section">
            <h3>חסרים</h3>
            <div className="missing-prereq-list">
              {prereqMeta.missingPrereqs.map((missing) => (
                <button
                  key={missing.id}
                  type="button"
                  className="missing-prereq-row"
                  onClick={() => onAddPrereq(missing.id)}
                  title={`הוסף את ${missing.name} לתכנית`}
                >
                  <span className="missing-prereq-name">
                    {missing.name}
                    {missing.name !== missing.id ? <span className="missing-prereq-id"> • {missing.id}</span> : null}
                  </span>
                  <span className="missing-tooltip-icon">+</span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="detail-actions">
          <button className="button" type="button" onClick={() => onToggleComplete(course.id)}>
            {course.completed ? 'בטל הושלמה' : 'סמן הושלמה'}
          </button>
          <button className="button danger" type="button" onClick={() => onDelete(course.id)}>
            הסר קורס
          </button>
        </div>
      </div>
    </div>
  );
}
