import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import CourseCard from './components/CourseCard';
import SemesterColumn from './components/SemesterColumn';
import TrackSelector from './components/TrackSelector';
import StatsBar from './components/StatsBar';
import type { Course, PlannerCourse, TrackEntry } from './types';
import courseCatalog from './data/courseCatalog.json';
import trackCatalog from './data/trackCatalog.json';

const SEMESTER_COUNT = 8;
const STORAGE_KEY = 'banana-bread-vite-state';
const catalog = courseCatalog as Course[];
const trackEntries = trackCatalog as TrackEntry[];

function App() {
  const [courses, setCourses] = useState<PlannerCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrackOpen, setIsTrackOpen] = useState(false);
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
      .slice(0, 12);
  }, [searchQuery, catalog, courses]);

  const trackNames = useMemo(
    () => Array.from(new Set(trackEntries.map((entry) => entry.track_name))).sort((a, b) => a.localeCompare(b, 'he')),
    [trackEntries]
  );

  const trackMap = useMemo(() => {
    const map = new Map<string, TrackEntry[]>();
    trackEntries.forEach((entry) => {
      const list = map.get(entry.track_name) ?? [];
      list.push(entry);
      map.set(entry.track_name, list);
    });
    return map;
  }, [trackEntries]);

  const getCourseError = useCallback(
    (course: PlannerCourse) => {
      const missing = course.prereqs.filter((id) => {
        const prereqCourse = courses.find((item) => item.id === id);
        return !(prereqCourse && (prereqCourse.completed || prereqCourse.semester < course.semester));
      });
      return missing.length ? `חסר: ${missing.join(', ')}` : null;
    },
    [courses]
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

  const loadTrack = useCallback(
    (trackName: string) => {
      const entries = trackMap.get(trackName) ?? [];
      const loaded = entries
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
    [courseMap, createPlannerCourse, trackMap]
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

  return (
    <div className="app-shell">
      <div className="panel">
        <StatsBar
          totalCredits={totalCredits}
          completedCount={completedCount}
          currentCourses={courses.length}
          activeSemester={SEMESTER_COUNT}
        />

        <section className="card">
          <h2>חיפוש והוספת קורסים</h2>
          <div className="search-row">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חפש קורס לפי שם או קוד"
            />
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
            {trackNames.slice(0, 10).map((trackName) => (
              <button key={trackName} type="button" className="track-item" onClick={() => loadTrack(trackName)}>
                <span>{trackName}</span>
                <span>טען</span>
              </button>
            ))}
          </div>
          {trackNames.length > 10 ? <p style={{ marginTop: 12, color: '#64748b' }}>השתמש בחיפוש במסך בוחר המסלולים כדי למצוא עוד.</p> : null}
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
                onToggleComplete={toggleComplete}
                onDelete={removeCourse}
                onFocusCourse={setFocusedCourseId}
                getCourseError={getCourseError}
              />
            ))}
          </div>
          <DragOverlay>
            {dragOverlayCourse ? (
              <CourseCard
                course={dragOverlayCourse}
                error={getCourseError(dragOverlayCourse) ?? undefined}
                blockCount={blocksByCourse[dragOverlayCourse.id] ?? 0}
                onToggleComplete={toggleComplete}
                onDelete={removeCourse}
                onFocus={() => undefined}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TrackSelector open={isTrackOpen} tracks={trackNames} onClose={() => setIsTrackOpen(false)} onSelect={loadTrack} />
    </div>
  );
}

export default App;
