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

interface GroupView {
  group: RequirementGroup;
  name: string;
  parentPath: string;
  plannedCount: number;
  earnedCredits: number;
  isMandatory: boolean;
}

function splitLabel(label: string): { name: string; parentPath: string } {
  const parts = label.split(' / ').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { name: label, parentPath: '' };
  return { name: parts[parts.length - 1], parentPath: parts.slice(0, -1).join(' › ') };
}

const MANDATORY_HINT = /חובה|mandatory/i;

function RequirementsPanel({ trackLabel, groups, courseMap, plannerCourses, onAddCourse, onClearTrack }: RequirementsPanelProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState('');

  const plannedById = useMemo(() => new Map(plannerCourses.map((course) => [course.id, course])), [plannerCourses]);

  const groupViews = useMemo<GroupView[]>(() => {
    const views = groups.map((group) => {
      const planned = group.courses.filter((id) => plannedById.has(id));
      const earnedCredits = planned.reduce((sum, id) => sum + (plannedById.get(id)?.credits ?? 0), 0);
      return {
        group,
        ...splitLabel(group.label),
        plannedCount: planned.length,
        earnedCredits,
        isMandatory: MANDATORY_HINT.test(group.label)
      };
    });
    // mandatory groups first, then by how much of the group is already planned, big generic pools last
    return views.sort((a, b) => {
      if (a.isMandatory !== b.isMandatory) return a.isMandatory ? -1 : 1;
      const aRatio = a.plannedCount / a.group.courses.length;
      const bRatio = b.plannedCount / b.group.courses.length;
      if (aRatio !== bRatio) return bRatio - aRatio;
      return a.group.courses.length - b.group.courses.length;
    });
  }, [groups, plannedById]);

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
        {groupViews.map(({ group, name, parentPath, plannedCount, earnedCredits, isMandatory }) => {
          const isOpen = openGroupId === group.id;
          const progress = group.courses.length ? Math.min(1, plannedCount / group.courses.length) : 0;
          const visibleCourses = isOpen
            ? group.courses.filter((courseId) => {
                if (!courseFilter.trim()) return true;
                const course = courseMap.get(courseId);
                const haystack = `${course?.name ?? ''} ${courseId}`;
                return haystack.includes(courseFilter.trim());
              })
            : [];
          return (
            <div key={group.id} className={`requirement-group${isOpen ? ' open' : ''}`}>
              <button
                type="button"
                className="requirement-group-toggle"
                aria-expanded={isOpen}
                onClick={() => {
                  setOpenGroupId(isOpen ? null : group.id);
                  setCourseFilter('');
                }}
              >
                <span className="requirement-group-titles">
                  {parentPath ? <span className="requirement-group-path">{parentPath}</span> : null}
                  <span className="requirement-group-label">
                    {name}
                    {isMandatory ? <span className="pill mandatory-pill">חובה</span> : null}
                  </span>
                </span>
                <span className="requirement-group-meta">
                  {plannedCount}/{group.courses.length}
                  {earnedCredits > 0 ? ` • ${earnedCredits} נק'` : ''}
                </span>
              </button>
              <div className="requirement-group-progress" aria-hidden="true">
                <div className="requirement-group-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              {isOpen ? (
                <div className="requirement-group-courses">
                  {group.courses.length > 8 ? (
                    <input
                      className="requirement-course-filter"
                      value={courseFilter}
                      onChange={(event) => setCourseFilter(event.target.value)}
                      placeholder="סנן לפי שם או קוד"
                    />
                  ) : null}
                  {visibleCourses.map((courseId) => {
                    const course = courseMap.get(courseId);
                    const inPlan = plannedById.has(courseId);
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
                  {visibleCourses.length === 0 ? <p className="requirement-course-missing">אין קורסים תואמים.</p> : null}
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
