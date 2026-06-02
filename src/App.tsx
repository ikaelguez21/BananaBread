import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import CourseCard from './components/CourseCard';
import SemesterColumn from './components/SemesterColumn';
import TrackSelector from './components/TrackSelector';
import StatsBar from './components/StatsBar';
import CourseDetailModal from './components/CourseDetailModal';
import type { Course, PlannerCourse, MissingPrereq, PrereqMeta, TrackOption } from './types';
import courseCatalog from './data/courseCatalog.json';
import { analyzePrerequisites, normalizeId } from './utils/prerequisite';
import { createStaticTrackLoader } from './services/trackService';

const SEMESTER_COUNT = 8;
const MAX_SEMESTER_CREDITS = 30;
const STORAGE_KEY = 'banana-bread-vite-state';
const catalog = courseCatalog as Course[];
const trackLoader = createStaticTrackLoader();

function App() {
  const [courses, setCourses] = useState<PlannerCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSort, setSearchSort] = useState<'name' | 'id'>('name');
  const [isTrackOpen, setIsTrackOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [focusedCourseId, setFocusedCourseId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PlannerCourse[];
        setCourses(parsed);
        return;
      } catch {
        // ignore invalid saved state
      }
    }
    setCourses([]);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  const courseMap = useMemo(() => new Map(catalog.map((course) => [course.id, course])), []);

  const blocksByCourse = useMemo(() => {
    const result: Record<string, number> = {};
    courses.forEach((course) => {
      course.prereqs.forEach((prereq) => {
        result[prereq] = (result[prereq] || 0) + 1;
      });
    });
    return result;
  }, [courses]);

  const semesterGroups = useMemo(() => {
    return Array.from({ length: SEMESTER_COUNT }, (_, index) => {
      return courses
        .filter((course) => course.semester === index + 1)
        .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    });
  }, [courses]);

  const totalCredits = useMemo(() => courses.reduce((sum, course) => sum + course.credits, 0), [courses]);
  const completedCount = useMemo(() => courses.filter((course) => course.completed).length, [courses]);

  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.trim().toLowerCase();
    return catalog
      .filter((course) => {
        const term = `${course.name} ${course.id}`.toLowerCase();
        return term.includes(query) && !courses.some((item) => item.id === course.id);
      })
      .sort((a, b) =>
        searchSort === 'name'
          ? a.name.localeCompare(b.name, 'he')
          : a.id.localeCompare(b.id)
      )
      .slice(0, 12);
  }, [searchQuery, searchSort, catalog, courses]);

  const trackOptions = useMemo<TrackOption[]>(() => trackLoader.getTrackOptions(), []);

  const getCoursePrereqMeta = useCallback(
    (course: PlannerCourse) => {
      const buildMissing = (ids: string[]) =>
        ids.map((id) => ({ id, name: courseMap.get(normalizeId(id))?.name ?? id }));

      const getPrereqIds = (prereqString: string) => Array.from(new Set(prereqString.match(/\d{8}/g) || []));
      const isCourseSatisfied = (id: string) => {
        const prereqCourse = courses.find((item) => normalizeId(item.id) === normalizeId(id));
        return Boolean(prereqCourse && (prereqCourse.completed || prereqCourse.semester < course.semester));
      };

      if (course.prereqString && course.prereqString.trim()) {
        const analysis = analyzePrerequisites(course.prereqString, course.semester, courses);
        const missingIds = analysis.isSatisfied
          ? []
          : getPrereqIds(course.prereqString).filter((id) => !isCourseSatisfied(id));
        return {
          error: analysis.isSatisfied ? null : `חסר: ${analysis.logicString}`,
          missingPrereqs: buildMissing(missingIds)
        };
      }

      const missing = course.prereqs.filter((id) => !isCourseSatisfied(id));
      return {
        error: missing.length ? `חסר: ${missing.join(', ')}` : null,
        missingPrereqs: buildMissing(missing)
      };
    },
    [courses, courseMap]
  );

  const createPlannerCourse = useCallback((course: Course, semester = 1): PlannerCourse => {
    return { ...course, semester, completed: false };
  }, []);

  const addCourse = useCallback(
    (course: Course, semester = 1) => {
      setCourses((prev) => {
        if (prev.some((item) => item.id === course.id)) return prev;
        return [...prev, createPlannerCourse(course, semester)];
      });
    },
    [createPlannerCourse]
  );

  const removeCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== courseId));
  }, []);

  const toggleComplete = useCallback((courseId: string) => {
    setCourses((prev) =>
      prev.map((course) => (course.id === courseId ? { ...course, completed: !course.completed } : course))
    );
  }, []);

  const addPrerequisiteCourse = useCallback(
    (missingId: string, targetSemester: number) => {
      const canonicalId = normalizeId(missingId);
      const existing = courses.find((course) => normalizeId(course.id) === canonicalId);
      if (existing) {
        setCourses((prev) =>
          prev.map((course) =>
            normalizeId(course.id) === canonicalId ? { ...course, semester: Math.max(1, targetSemester) } : course
          )
        );
        return;
      }

      const sourceCourse = courseMap.get(canonicalId);
      if (!sourceCourse) return;
      setCourses((prev) => [...prev, createPlannerCourse(sourceCourse, Math.max(1, targetSemester))]);
    },
    [courseMap, courses, createPlannerCourse]
  );

  const loadTrack = useCallback(
    (trackId: string) => {
      const { semesterEntries } = trackLoader.loadTrack(trackId);
      const loaded = semesterEntries
        .map((entry) => {
          const sourceCourse = courseMap.get(entry.course_id);
          return createPlannerCourse(
            sourceCourse ?? {
              id: entry.course_id,
              name: entry.course_id,
              faculty: 'לא ידוע',
              credits: 0,
              prereqString: '',
              prereqs: []
            },
            entry.semester
          );
        })
        .sort((left, right) => left.semester - right.semester);
      setCourses(loaded);
      setIsTrackOpen(false);
    },
    [courseMap, createPlannerCourse]
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (typeof event.active.id === 'string') {
      setActiveDragId(event.active.id);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      if (!over || typeof active.id !== 'string' || typeof over.id !== 'string') return;
      const courseId = active.id.replace('course-', '');
      const semesterMatch = over.id.match(/^semester-(\d+)$/);
      if (!semesterMatch) return;
      const targetSemester = Number(semesterMatch[1]);
      setCourses((prev) =>
        prev.map((course) => (course.id === courseId ? { ...course, semester: targetSemester } : course))
      );
    },
    []
  );

  const dragOverlayCourse = useMemo(() => {
    if (!activeDragId) return null;
    const courseId = activeDragId.replace('course-', '');
    return courses.find((course) => course.id === courseId) ?? null;
  }, [activeDragId, courses]);

  const selectedCourse = selectedCourseId ? courses.find((course) => course.id === selectedCourseId) ?? null : null;
  const selectedCourseMeta = selectedCourse ? getCoursePrereqMeta(selectedCourse) : null;
  const selectedCourseBlockCount = selectedCourse ? blocksByCourse[selectedCourse.id] ?? 0 : 0;

  return (
    <div className="app-shell">
      <div className="panel">
        <StatsBar
          totalCredits={totalCredits}
          completedCount={completedCount}
          currentCourses={courses.length}
          activeSemester={SEMESTER_COUNT}
        />

        <section className="card hero-card">
          <p className="eyebrow">🧠 תכנון חכם</p>
          <h2>צור מסלול לימודים ברור ויזואלי</h2>
          <p>גרור קורסים בין סמסטרים, קבל חיווי על חוסרי קדם בזמן אמת, וטען מסלולים מוכנים בלחיצה אחת.</p>
          <div className="hero-actions">
            <span className="pill">נשמר אוטומטית</span>
            <span className="pill soft">תואם 8 סמסטרים</span>
          </div>
        </section>

        <section className="card">
          <h2>חיפוש והוספת קורסים</h2>
          <div className="search-row">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חפש קורס לפי שם או קוד"
            />
            <div className="search-controls">
              <label>
                מיין לפי
                <select value={searchSort} onChange={(event) => setSearchSort(event.target.value as 'name' | 'id')}>
                  <option value="name">שם</option>
                  <option value="id">קוד</option>
                </select>
              </label>
            </div>
            <div className="button-group">
              <button className="button" type="button" onClick={() => setIsTrackOpen(true)}>
                בחר מסלול
              </button>
              <button className="button secondary" type="button" onClick={() => setCourses([])}>
                נקה תכנית
              </button>
            </div>
          </div>
          {suggestions.length > 0 ? (
            <div className="track-list">
              {suggestions.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className="track-item"
                  onClick={() => addCourse(course)}
                >
                  <span>{course.name} • {course.id}</span>
                  <strong>הוסף</strong>
                </button>
              ))}
            </div>
          ) : (
            searchQuery && <p>אין קורסים תואמים להצעה.</p>
          )}
        </section>

        <section className="card">
          <h2>מסלולים זמינים</h2>
          <p>בחר מסלול כדי למלא את התכנית עם קורסים מוכנים.</p>
          <div className="track-list">
            {trackOptions.slice(0, 10).map((track) => (
              <button key={track.id} type="button" className="track-item" onClick={() => loadTrack(track.id)}>
                <span>{track.label}</span>
                <span>טען</span>
              </button>
            ))}
          </div>
          {trackOptions.length > 10 ? <p style={{ marginTop: 12, color: '#64748b' }}>השתמש בחיפוש במסך בוחר המסלולים כדי למצוא עוד.</p> : null}
        </section>
      </div>

      <div className="panel">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="board">
            {semesterGroups.map((semesterCourses, index) => (
              <SemesterColumn
                key={index}
                semester={index + 1}
                courses={semesterCourses}
                blocksByCourse={blocksByCourse}
                maxCredits={MAX_SEMESTER_CREDITS}
                onToggleComplete={toggleComplete}
                onDelete={removeCourse}
                onViewDetails={setSelectedCourseId}
                onFocusCourse={setFocusedCourseId}
                getCoursePrereqMeta={getCoursePrereqMeta}
                onAddPrereq={addPrerequisiteCourse}
              />
            ))}
          </div>
          <DragOverlay>
            {dragOverlayCourse ? (
              <CourseCard
                course={dragOverlayCourse}
                error={getCoursePrereqMeta(dragOverlayCourse).error ?? undefined}
                missingPrereqs={getCoursePrereqMeta(dragOverlayCourse).missingPrereqs}
                blockCount={blocksByCourse[dragOverlayCourse.id] ?? 0}
                onToggleComplete={toggleComplete}
                onDelete={removeCourse}
                onViewDetails={setSelectedCourseId}
                onFocus={() => undefined}
                onAddPrereq={(missingId) => addPrerequisiteCourse(missingId, Math.max(1, dragOverlayCourse.semester - 1))}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <CourseDetailModal
        open={Boolean(selectedCourse)}
        course={selectedCourse}
        prereqMeta={selectedCourseMeta}
        blockCount={selectedCourseBlockCount}
        onClose={() => setSelectedCourseId(null)}
        onToggleComplete={toggleComplete}
        onDelete={removeCourse}
        onAddPrereq={(missingId) => selectedCourse ? addPrerequisiteCourse(missingId, Math.max(1, selectedCourse.semester - 1)) : undefined}
      />
      <TrackSelector open={isTrackOpen} tracks={trackOptions} onClose={() => setIsTrackOpen(false)} onSelect={loadTrack} />
    </div>
  );
}

export default App;
