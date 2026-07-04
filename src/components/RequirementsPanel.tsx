import { useMemo, useState } from 'react';
import type { Course, PlannerCourse, RequirementGroup } from '../types';

interface RequirementsPanelProps {
  trackLabel: string;
  groups: RequirementGroup[];
  courseMap: Map<string, Course>;
  plannerCourses: PlannerCourse[];
  onAddCourse: (course: Course) => void;
  onClearTrack: () => void;
}

function RequirementsPanel({ trackLabel, groups, courseMap, plannerCourses, onAddCourse, onClearTrack }: RequirementsPanelProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const plannedIds = useMemo(() => new Set(plannerCourses.map((course) => course.id)), [plannerCourses]);

  const groupStats = useMemo(() => {
    return groups.map((group) => {
      const planned = group.courses.filter((id) => plannedIds.has(id));
      const earnedCredits = planned.reduce((sum, id) => {
        const course = plannerCourses.find((item) => item.id === id);
        return sum + (course?.credits ?? 0);
      }, 0);
      return { group, plannedCount: planned.length, earnedCredits };
    });
  }, [groups, plannedIds, plannerCourses]);

  if (!groups.length) return null;

  return (
    <section className="card requirements-panel">
      <div className="requirements-header">
        <div>
          <h2>דרישות המסלול</h2>
          <p className="requirements-track-label">{trackLabel}</p>
        </div>
        <button className="button secondary" type="button" onClick={onClearTrack}>
          נקה מסלול
        </button>
      </div>

      <div className="requirements-groups">
        {groupStats.map(({ group, plannedCount, earnedCredits }) => {
          const isOpen = openGroupId === group.id;
          return (
            <div key={group.id} className={`requirement-group${isOpen ? ' open' : ''}`}>
              <button
                type="button"
                className="requirement-group-toggle"
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
              >
                <span className="requirement-group-label">{group.label}</span>
                <span className="requirement-group-meta">
                  {plannedCount}/{group.courses.length} קורסים
                  {earnedCredits > 0 ? ` • ${earnedCredits} נק'` : ''}
                </span>
              </button>
              {isOpen ? (
                <div className="requirement-group-courses">
                  {group.courses.map((courseId) => {
                    const course = courseMap.get(courseId);
                    const inPlan = plannedIds.has(courseId);
                    return (
                      <div key={courseId} className="requirement-course-row">
                        <span className="requirement-course-name">
                          {course ? course.name : courseId}
                          <span className="requirement-course-id"> • {courseId}{course ? ` • ${course.credits} נק'` : ''}</span>
                        </span>
                        {inPlan ? (
                          <span className="pill soft">בתכנית</span>
                        ) : course ? (
                          <button className="button small" type="button" onClick={() => onAddCourse(course)}>
                            הוסף
                          </button>
                        ) : (
                          <span className="requirement-course-missing">לא בקטלוג</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default RequirementsPanel;
