import { useCallback, useEffect, useRef, useState } from 'react';
import getAllAncestors from './hooks/getAllAncestors.ts';
import Icons from './data/Icons.tsx';
import TrackSelectionModal from './TrackSelectionModal.tsx';
import CourseCard from './CourceCard.tsx';
import checkPrerequisiteError from './hooks/checkPrerequisiteError.ts';
import getBlockingCount from './hooks/getBlockingCount.ts';

const DegreePlanner = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bananabread_theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [catalog, setCatalog] = useState([]);
  const [loadingStatus, setLoadingStatus] = useState('loading');
  const [statusMessage, setStatusMessage] = useState('טוען קטלוג...');
  const [courses, setCourses] = useState([]);
  const [semesterCount, setSemesterCount] = useState(8);
  const [draggedCourse, setDraggedCourse] = useState(null);
  const [hoveredCourse, setHoveredCourse] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPrereqSelector, setShowPrereqSelector] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);

  // Form states
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCredits, setNewCourseCredits] = useState(3);
  const [newCourseSem, setNewCourseSem] = useState(1);
  const [newCoursePrereqs, setNewCoursePrereqs] = useState([]);
  const [newCourseId, setNewCourseId] = useState(null);
  const [newCourseFaculty, setNewCourseFaculty] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [pendingCourse, setPendingCourse] = useState(null);
  const [missingPrereqOptions, setMissingPrereqOptions] = useState([]);
  const [selectedPrereqsToAdd, setSelectedPrereqsToAdd] = useState([]);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [connections, setConnections] = useState([]);

  const wrapperRef = useRef(null);
  const courseRefs = useRef({});
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Dark Mode Effect
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('bananabread_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('bananabread_theme', 'light');
    }
  }, [isDarkMode]);

  // Load / Save Logic
  useEffect(() => {
    const savedCourses = localStorage.getItem('technion_planner_courses_v5');
    const savedSemesters = localStorage.getItem('technion_planner_semesters_v5');
    if (savedCourses) {
      try {
        setCourses(JSON.parse(savedCourses));
      } catch (e) {}
    }
    if (savedSemesters) setSemesterCount(parseInt(savedSemesters));
  }, []);

  useEffect(() => {
    if (courses.length > 0 || semesterCount !== 8) {
      localStorage.setItem('technion_planner_courses_v5', JSON.stringify(courses));
      localStorage.setItem('technion_planner_semesters_v5', semesterCount.toString());
    }
  }, [courses, semesterCount]);

  // Load Catalog
  useEffect(() => {
    const loadData = async () => {
      const fetchCsv = (file) =>
        new Promise((resolve, reject) => {
          Papa.parse(file, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data),
            error: (err) => reject(err)
          });
        });
      try {
        const coursesRaw = await fetchCsv('courses.csv');
        if (!coursesRaw || coursesRaw.length === 0) throw new Error('קובץ ריק');
        const processedCatalog = coursesRaw
          .map((row) => {
            if (!row.id) return null;
            return {
              id: normalizeId(row.id),
              name: row.name || 'ללא שם',
              credits: parseFloat(row.points || row.credits || 0),
              faculty: row.faculty || '',
              recSem: 1,
              prereqs:
                (row.prerequisites || '').match(/\d{6,8}/g)?.map((n) => normalizeId(n)) || [],
              prereqString: row.prerequisites || ''
            };
          })
          .filter(Boolean);
        setCatalog(processedCatalog);
        setLoadingStatus('success');
        setStatusMessage(`קטלוג: ${processedCatalog.length} קורסים`);
      } catch (err) {
        setLoadingStatus('error');
        setStatusMessage(`שגיאה בטעינת קטלוג. וודא שקובץ courses.csv קיים.`);
      }
    };
    loadData();
  }, []);

  // Connection Lines Logic
  const updateConnections = useCallback(() => {
    if (!containerRef.current) {
      setConnections([]);
      return;
    }
    if (!showAllConnections && !hoveredCourse) {
      setConnections([]);
      return;
    }

    requestAnimationFrame(() => {
      try {
        const newConnections = [];
        const containerRect = containerRef.current.getBoundingClientRect();
        const scrollLeft = containerRef.current.scrollLeft;
        const scrollTop = containerRef.current.scrollTop;

        const getCoords = (id) => {
          const el = courseRefs.current[id];
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return {
            left: rect.left - containerRect.left + scrollLeft,
            right: rect.right - containerRect.left + scrollLeft,
            centerY: (rect.top + rect.bottom) / 2 - containerRect.top + scrollTop
          };
        };

        const createPath = (src, tgt) => {
          const startX = tgt.left;
          const startY = tgt.centerY;
          const endX = src.right;
          const endY = src.centerY;
          const dist = Math.abs(startX - endX);
          const controlOffset = Math.min(dist * 0.5, 80);
          return `M ${startX} ${startY} C ${startX - controlOffset} ${startY}, ${endX + controlOffset} ${endY}, ${endX} ${endY}`;
        };

        const baseLineColor = isDarkMode ? '#475569' : '#cbd5e1'; // slate-600 vs slate-300

        if (showAllConnections) {
          courses.forEach((c) => {
            if (!c.prereqs || c.prereqs.length === 0) return;
            const sourceCoords = getCoords(c.id);
            if (!sourceCoords) return;
            c.prereqs.forEach((pid) => {
              const prereqCourse = courses.find((pc) => pc.id === pid);
              if (prereqCourse) {
                const targetCoords = getCoords(pid);
                if (targetCoords)
                  newConnections.push({
                    id: `${c.id}-${pid}`,
                    path: createPath(sourceCoords, targetCoords),
                    color: baseLineColor,
                    opacity: 0.3,
                    width: 2
                  });
              }
            });
          });
        }

        if (hoveredCourse) {
          const ancestors = getAllAncestors(hoveredCourse.id, courses);
          const chainSet = new Set([...ancestors, hoveredCourse.id]);

          courses.forEach((c) => {
            if (chainSet.has(c.id) && c.prereqs) {
              c.prereqs.forEach((pid) => {
                if (chainSet.has(pid)) {
                  const src = getCoords(c.id);
                  const tgt = getCoords(pid);
                  if (src && tgt)
                    newConnections.push({
                      id: `chain-${c.id}-${pid}`,
                      path: createPath(src, tgt),
                      color: '#3b82f6',
                      opacity: 0.8,
                      width: 3
                    });
                }
              });
            }
          });

          courses
            .filter((c) => c.prereqs && c.prereqs.includes(hoveredCourse.id))
            .forEach((post) => {
              const src = getCoords(post.id);
              const tgt = getCoords(hoveredCourse.id);
              if (src && tgt)
                newConnections.push({
                  id: `post-${post.id}`,
                  path: createPath(src, tgt),
                  color: '#f59e0b',
                  opacity: 0.8,
                  width: 3
                });
            });
        }
        setConnections(newConnections);
      } catch (e) {
        setConnections([]);
      }
    });
  }, [hoveredCourse, courses, showAllConnections, isDarkMode]);

  useEffect(() => {
    updateConnections();
  }, [updateConnections]);

  // Handlers
  const resetAllData = () => {
    if (confirm('בטוח שברצונך למחוק הכל ולהתחיל מחדש?')) {
      setCourses([]);
      setSemesterCount(8);
      localStorage.removeItem('technion_planner_courses_v5');
      localStorage.removeItem('technion_planner_semesters_v5');
    }
  };

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify({
          courses,
          semesterCount,
          version: '24'
        })
      );
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'bananabread_plan.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportClick = () => fileInputRef.current.click();
  const handleImportFile = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (json.courses) setCourses(json.courses);
        if (json.semesterCount) setSemesterCount(json.semesterCount);
        alert('התוכנית נטענה בהצלחה!');
      } catch (err) {
        alert('שגיאה בטעינת הקובץ');
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleTrackSelect = async (selectionId) => {
    if (!selectionId) return;
    const [fileName, trackName] = selectionId.split(':');
    if (courses.length > 0 && !window.confirm('טעינת מסלול תמחק את הקורסים הקיימים. להמשיך?'))
      return;

    setLoadingStatus('loading');
    setStatusMessage(`טוען מסלול ${trackName}...`);
    setShowTrackModal(false);
    try {
      const response = await fetch(fileName);
      if (!response.ok) throw new Error(`הקובץ ${fileName} לא נמצא`);
      Papa.parse(await response.text(), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const trackRows = results.data.filter((row) => row.track_name === trackName);
          if (trackRows.length === 0) throw new Error(`המסלול לא נמצא בקובץ`);
          const newBoard = [];
          let maxSem = semesterCount;
          trackRows.forEach((row) => {
            const cId = normalizeId(row.course_id || row.id);
            const semester = parseInt(row.semester || row.recommended_semester);
            if (semester > maxSem) maxSem = semester;
            const fullDetails = catalog.find((c) => c.id === cId);
            if (fullDetails)
              newBoard.push({ ...fullDetails, semester: semester, completed: false });
            else
              newBoard.push({
                id: cId,
                name: cId,
                credits: 0,
                semester: semester,
                completed: false
              });
          });
          if (maxSem > semesterCount) setSemesterCount(maxSem);
          setCourses(newBoard);
          setLoadingStatus('success');
          setStatusMessage('מסלול נטען');
        },
        error: (err) => {
          throw new Error('שגיאת CSV');
        }
      });
    } catch (err) {
      setLoadingStatus('error');
      setStatusMessage(`שגיאה: ${err.message}`);
    }
  };

  const toggleCourseCompletion = useCallback((courseId) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, completed: !c.completed } : c))
    );
  }, []);

  const handleSaveCourse = () => {
    if (!newCourseName) return;
    const targetSem = parseInt(newCourseSem);
    const catalogCourse = catalog.find((c) => c.id === newCourseId);
    const prereqStr = catalogCourse ? catalogCourse.prereqString : '';

    const courseData = {
      id: newCourseId || Math.random().toString(36).substr(2, 9),
      name: newCourseName,
      semester: targetSem,
      credits: parseFloat(newCourseCredits) || 0,
      prereqs: newCoursePrereqs || [],
      faculty: newCourseFaculty || '',
      prereqString: prereqStr,
      completed: false
    };

    if (editingId) {
      setCourses((prev) => [...prev.filter((c) => c.id !== editingId), courseData]);
      setIsEditing(false);
      return;
    }

    let missingIds = [];
    if (prereqStr)
      missingIds = (prereqStr.match(/\d{6,8}/g) || []).filter(
        (pid) => !courses.find((c) => c.id === pid)
      );

    if (missingIds.length > 0) {
      const options = missingIds
        .map((mid) => {
          const catInfo = catalog.find((c) => c.id === mid);
          return { id: mid, name: catInfo ? catInfo.name : mid };
        })
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i);

      setPendingCourse(courseData);
      setMissingPrereqOptions(options);
      setSelectedPrereqsToAdd([]);
      setIsEditing(false);
      setShowPrereqSelector(true);
      return;
    }

    setCourses([...courses, courseData]);
    setIsEditing(false);
  };

  const confirmPrereqSelection = () => {
    if (!pendingCourse) return;
    const targetCourse = { ...pendingCourse };
    let prereqSemester = Math.max(1, targetCourse.semester - 1);
    if (selectedPrereqsToAdd.length > 0 && targetCourse.semester <= 1) {
      targetCourse.semester = 2;
      prereqSemester = 1;
    }
    const extras = selectedPrereqsToAdd.map((pid) => {
      const catInfo = catalog.find((c) => c.id === pid);
      return {
        id: pid,
        name: catInfo ? catInfo.name : pid,
        credits: catInfo ? catInfo.credits : 0,
        faculty: catInfo ? catInfo.faculty : '',
        semester: prereqSemester,
        prereqs: catInfo ? catInfo.prereqs : [],
        prereqString: catInfo ? catInfo.prereqString : '',
        completed: false
      };
    });
    setCourses([...courses, ...extras, targetCourse]);
    setShowPrereqSelector(false);
    setPendingCourse(null);
  };

  const handleDeleteCourse = useCallback((id) => {
    if (confirm('למחוק קורס זה?')) setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleDragStart = useCallback((e, course) => {
    setDraggedCourse(course);
  }, []);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, targetSemester) => {
    e.preventDefault();
    if (!draggedCourse) return;
    setCourses((prev) =>
      prev.map((c) => (c.id === draggedCourse.id ? { ...c, semester: targetSemester } : c))
    );
    setDraggedCourse(null);
  };

  // UI State Logic
  const getHighlightState = (courseId) => {
    if (searchQuery && searchQuery.length > 1) {
      const c = courses.find((x) => x.id === courseId);
      const match = c && (c.name.includes(searchQuery) || c.id.includes(searchQuery));
      if (match) return 'focused';
      return 'dimmed';
    }

    if (!hoveredCourse) return 'normal';
    if (hoveredCourse.id === courseId) return 'focused';

    const ancestors = getAllAncestors(hoveredCourse.id, courses);
    if (ancestors.has(courseId)) return 'ancestor';

    const blocking = courses.find((c) => c.id === courseId)?.prereqs?.includes(hoveredCourse.id);
    if (blocking) return 'descendant';

    if (!showAllConnections) return 'dimmed';

    return 'normal';
  };

  const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 0), 0);
  const completedCredits = courses.reduce((acc, c) => acc + (c.completed ? c.credits || 0 : 0), 0);
  const progress = totalCredits > 0 ? (completedCredits / totalCredits) * 100 : 0;

  const openAddModal = (sem) => {
    setEditingId(null);
    setNewCourseName('');
    setNewCourseSem(sem);
    setNewCourseId(null);
    setSuggestions([]);
    setIsEditing(true);
  };
  const openEditModal = useCallback((c) => {
    setEditingId(c.id);
    setNewCourseName(c.name);
    setNewCourseCredits(c.credits);
    setNewCourseSem(c.semester);
    setNewCoursePrereqs(c.prereqs || []);
    setNewCourseId(c.id);
    setNewCourseFaculty(c.faculty);
    setIsEditing(true);
  }, []);
  const handleNameChange = (e) => {
    const val = e.target.value;
    setNewCourseName(val);
    if (val.length > 1) {
      const searchVal = normalizeId(val);
      setSuggestions(
        catalog.filter((c) => c.name.includes(val) || c.id.includes(searchVal)).slice(0, 10)
      );
      setShowSuggestions(true);
    } else setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-40 px-6 py-3 flex justify-between items-center shrink-0 transition-colors">
        <div className="flex items-center gap-6">
          {/* BRAND / LOGO AREA (Restored v19 'Watermark' Style) */}
          <div className="relative group select-none">
            <h1 className="text-3xl font-extrabold relative z-10 py-1 px-2 flex items-center">
              {/* The large, rotated, watermark logo */}
              <div className="absolute -right-2 -top-4 w-20 h-20 opacity-20 z-[-1] pointer-events-none rotate-12">
                <img
                  src="bananaBreadLogo.png"
                  alt="Logo"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:opacity-30"
                />
              </div>

              {/* Gradient Text */}
              <span className="bg-gradient-to-r from-yellow-600 to-amber-700 dark:from-yellow-400 dark:to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
                BananaBread
              </span>

              {/* Version Badge */}
              <span className="absolute -bottom-1 -left-2 text-[10px] font-medium text-slate-400 bg-slate-50/80 dark:bg-slate-700/80 px-1.5 rounded-full border border-slate-100 dark:border-slate-600">
                v24
              </span>
            </h1>
          </div>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTrackModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold transition-colors"
            >
              <Icons.BookOpen size={16} /> מסלול
            </button>
            <button
              onClick={() => setShowAllConnections(!showAllConnections)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border ${showAllConnections ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 border-slate-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {showAllConnections ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />} תלות
            </button>

            {/* Search Bar */}
            <div className="relative group ml-4">
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                <Icons.Search size={14} />
              </div>
              <input
                type="text"
                placeholder="חיפוש מהיר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9 pl-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-transparent focus:bg-white dark:focus:bg-slate-600 focus:border-indigo-300 rounded-lg text-sm w-48 transition-all focus:w-64 outline-none text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-0 flex items-center pl-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          {loadingStatus !== 'success' && (
            <span className="text-xs flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
              <Icons.Loader size={12} /> {statusMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-300 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={isDarkMode ? 'מצב יום' : 'מצב לילה'}
          >
            {isDarkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            className="hidden"
            accept=".json"
          />
          <button
            onClick={handleImportClick}
            className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="טען תוכנית"
          >
            <Icons.Upload size={18} />
          </button>
          <button
            onClick={handleExport}
            className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            title="שמור תוכנית"
          >
            <Icons.Download size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
          <button
            onClick={resetAllData}
            className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
            title="איפוס"
          >
            <Icons.Refresh size={16} />
          </button>
        </div>
      </div>

      {/* MODALS */}
      <TrackSelectionModal
        isOpen={showTrackModal}
        onClose={() => setShowTrackModal(false)}
        onSelectTrack={handleTrackSelect}
      />

      {showPrereqSelector && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[70] backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl max-w-lg w-full animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full text-amber-600 dark:text-amber-400">
                <Icons.GitBranch size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                  השלמת קדמים
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  הקורס <strong>{pendingCourse?.name}</strong> דורש קורסים שחסרים בלוח.
                </p>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar border dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 p-2 mb-4">
              {missingPrereqOptions.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 mb-2 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-indigo-600"
                    checked={selectedPrereqsToAdd.includes(opt.id)}
                    onChange={() =>
                      setSelectedPrereqsToAdd((prev) =>
                        prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]
                      )
                    }
                  />
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                      {opt.name}
                    </div>
                    <div className="text-xs text-slate-400">{opt.id}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPrereqSelector(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm"
              >
                ביטול
              </button>
              <button
                onClick={confirmPrereqSelection}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
              >
                הוסף מסומנים
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/30 flex items-start justify-center pt-20 z-[60] backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-4">
              {editingId ? 'עריכת קורס' : 'הוספת קורס'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" ref={wrapperRef}>
              <div className="md:col-span-2 relative">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  שם הקורס
                </label>
                <input
                  className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newCourseName}
                  onChange={handleNameChange}
                  placeholder="הקלד שם או מספר..."
                  autoFocus
                />
                {showSuggestions && (
                  <div className="absolute w-full bg-white dark:bg-slate-700 border dark:border-slate-600 shadow-xl rounded-lg mt-1 max-h-48 overflow-y-auto z-50">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setNewCourseName(s.name);
                          setNewCourseCredits(s.credits);
                          setNewCourseId(s.id);
                          setNewCourseFaculty(s.faculty);
                          setNewCoursePrereqs(
                            courses.filter((c) => s.prereqs.includes(c.id)).map((c) => c.id)
                          );
                          setShowSuggestions(false);
                        }}
                        className="w-full text-right px-4 py-2 hover:bg-indigo-50 dark:hover:bg-slate-600 border-b dark:border-slate-600 flex justify-between"
                      >
                        <span>{s.name}</span>
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 rounded">
                          {s.id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  נקודות
                </label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2 rounded-lg"
                  value={newCourseCredits}
                  onChange={(e) => setNewCourseCredits(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                  סמסטר
                </label>
                <select
                  className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white p-2 rounded-lg"
                  value={newCourseSem}
                  onChange={(e) => setNewCourseSem(e.target.value)}
                >
                  {Array.from({ length: semesterCount }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      סמסטר {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveCourse}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold flex items-center gap-2"
              >
                <Icons.Save size={16} /> שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN BOARD */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden relative custom-scrollbar bg-slate-100 dark:bg-slate-900 transition-colors"
        ref={containerRef}
      >
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          style={{ minWidth: 'max-content', height: '100%' }}
        >
          {connections.map((conn, i) => (
            <path
              key={conn.id + i}
              d={conn.path}
              stroke={conn.color}
              strokeOpacity={conn.opacity}
              strokeWidth={conn.width || 2}
              className="connection-line"
            />
          ))}
        </svg>

        <div className="flex gap-4 p-4 min-w-max h-full items-start">
          {Array.from({ length: semesterCount }, (_, i) => i + 1).map((semNum) => {
            const semCourses = courses.filter((c) => c.semester === semNum);
            const semCredits = semCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

            return (
              <div
                key={semNum}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, semNum)}
                className="w-80 flex flex-col h-[calc(100vh-140px)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-colors hover:border-indigo-300 dark:hover:border-indigo-500 z-10"
              >
                {/* Semester Header */}
                <div
                  className={`p-3 border-b border-slate-100 dark:border-slate-700 rounded-t-2xl flex justify-between items-center ${semCredits > 27 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-850'}`}
                >
                  <div>
                    <h2 className="font-bold text-slate-700 dark:text-slate-200">סמסטר {semNum}</h2>
                    <div
                      className={`text-xs font-bold ${semCredits > 27 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
                    >
                      {semCredits} נק'
                    </div>
                  </div>
                  <button
                    onClick={() => openAddModal(semNum)}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <Icons.PlusCircle size={20} />
                  </button>
                </div>

                {/* Course List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                  {semCourses.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-2">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Icons.Plus size={20} />
                      </div>
                      <span className="text-xs">גרירה או הוספה</span>
                    </div>
                  )}
                  {semCourses.map((course) => {
                    const error = checkPrerequisiteError(course, courses);
                    const blockCount = getBlockingCount(course.id, courses);
                    const highlightState = getHighlightState(course.id);

                    return (
                      <CourseCard
                        key={course.id}
                        course={course}
                        highlightState={highlightState}
                        error={error}
                        blockCount={blockCount}
                        onToggle={toggleCourseCompletion}
                        onEdit={openEditModal}
                        onDelete={handleDeleteCourse}
                        onDragStart={handleDragStart}
                        onHover={setHoveredCourse}
                        onLeave={() => setHoveredCourse(null)}
                        setRef={(el) => (courseRefs.current[course.id] = el)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setSemesterCount((c) => c + 1)}
            className="w-12 h-[calc(100vh-140px)] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center transition-all"
          >
            <Icons.Plus size={24} />
          </button>
        </div>
      </div>

      {/* FOOTER STATS */}
      <div className="glass-dark glass-dark-border text-white p-3 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-6 px-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              התקדמות לתואר
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-400">{completedCredits}</span>
              <span className="text-sm text-slate-400">/ {totalCredits}</span>
            </div>
          </div>
          <div className="w-48 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="text-xs text-slate-500 px-4">
          פותח ע"י סטודנטים מהטכניון &bull; BananaBread v24
        </div>
      </div>
    </div>
  );
};

export default DegreePlanner;
