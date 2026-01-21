// components.js
const { memo, useState } = React;

// --- HELPERS ---
window.normalizeId = (id) => String(id).trim();

window.getAllAncestors = (courseId, allCourses) => {
    const ancestors = new Set();
    try {
        const find = (cId, depth = 0) => {
            if (depth > 20) return; 
            const course = allCourses.find(c => c.id === cId);
            if (!course || !course.prereqs) return;
            course.prereqs.forEach(pId => {
                if (!ancestors.has(pId)) { ancestors.add(pId); find(pId, depth + 1); }
            });
        };
        find(courseId);
    } catch (e) { console.warn("Ancestor finding error", e); }
    return ancestors;
};

window.getBlockingCount = (courseId, allCourses) => {
    return allCourses.filter(c => c.prereqs && c.prereqs.includes(courseId)).length;
};

// --- UPDATED: Smart Logic Analysis (Strict 8 Digits) ---
window.analyzePrerequisites = (prereqString, targetSemester, currentCourses) => {
    if (!prereqString || typeof prereqString !== 'string' || !prereqString.trim()) {
        return { isSatisfied: true, isPotentiallySatisfied: true, missingIds: [], logicString: "" };
    }

    // 1. Normalize operators for evaluation
    let evalStr = prereqString.replace(/\s+OR\s+/gi, " || ").replace(/\s+AND\s+/gi, " && ");
    
    // 1.1 Prepare Display String (Hebrew translation)
    let displayStr = prereqString.replace(/\s+/g, " ")
        .replace(/\|\|/g, " או ")
        .replace(/&&/g, " ו- ")
        .replace(/\bOR\b/gi, " או ")
        .replace(/\bAND\b/gi, " ו- ");

    // 2. Extract strict 8-digit IDs
    const neededIds = evalStr.match(/\d{8}/g) || [];
    const missingIds = []; 
    
    const checkId = (rawId, checkSem) => {
        const id = window.normalizeId(rawId);
        const course = currentCourses.find(c => c.id === id);
        
        // If missing entirely from board (for Add Modal logic)
        if (!course && checkSem === targetSemester) {
            missingIds.push(id);
        }

        return course ? (course.completed || course.semester < checkSem) : false;
    };

    // 3. Evaluate Boolean Logic
    const evaluate = (checkSem) => {
        let localStr = evalStr;
        neededIds.forEach(rawId => {
            const isValid = checkId(rawId, checkSem);
            // Strict replacement to avoid partial matches
            const idRegex = new RegExp(`\\b${rawId}\\b`, 'g');
            localStr = localStr.replace(idRegex, isValid.toString());
        });
        try {
            const safeStr = localStr.replace(/[^truefalse\(\)\&\|!\s]/gi, "");
            if (!safeStr.trim()) return true;
            return new Function(`return (${safeStr});`)();
        } catch (e) { return true; }
    };

    const isSatisfied = evaluate(targetSemester);
    const isPotentiallySatisfied = evaluate(100); 

    // 4. Build Feedback String (Visual Logic)
    neededIds.forEach(rawId => {
        const isValid = checkId(rawId, targetSemester);
        if (isValid) {
            const idRegex = new RegExp(`\\b${rawId}\\b`, 'g');
            displayStr = displayStr.replace(idRegex, "✔");
        }
    });

    return {
        isSatisfied,
        isPotentiallySatisfied,
        missingIds: [...new Set(missingIds)],
        logicString: displayStr // Returns formatted logic string in Hebrew
    };
};

window.checkPrerequisiteError = (course, allCourses) => {
    try {
        if (course.prereqString) {
            const { isSatisfied, logicString } = window.analyzePrerequisites(course.prereqString, course.semester, allCourses);
            if (!isSatisfied) {
                // מציג למשתמש את הלוגיקה המפורשת
                return `חסר: ${logicString}`;
            }
            return null;
        }
        
        if (course.prereqs && course.prereqs.length > 0) {
            const missing = course.prereqs.filter(pid => {
                const pre = allCourses.find(c => c.id === pid);
                return !pre || (!pre.completed && pre.semester >= course.semester);
            });
            if (missing.length > 0) return `חסר: ${missing.join(', ')}`;
        }
        return null;
    } catch (e) { return null; }
};

window.getFacultyColor = (courseId, highlightState) => {
    // נשאר ללא שינוי, השארתי לקיצור
    const prefix = String(courseId).trim().substring(0, 4);
    const COLORS = {
        CS: "bg-emerald-50 border-emerald-200 border-l-emerald-600 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:border-l-emerald-500 dark:text-emerald-200",
        EE: "bg-sky-100 border-sky-300 border-l-sky-600 text-sky-900 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-100",
        AERO: "bg-cyan-100 border-cyan-300 border-l-cyan-600 text-cyan-900 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-100",
        PHYS: "bg-violet-100 border-violet-300 border-l-violet-600 text-violet-900 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-100",
        DATA: "bg-indigo-100 border-indigo-300 border-l-indigo-600 text-indigo-900 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-100",
        CIVIL: "bg-stone-100 border-stone-300 border-l-stone-600 text-stone-900 dark:bg-stone-900/30 dark:border-stone-700 dark:text-stone-100",
        BIO: "bg-teal-100 border-teal-300 border-l-teal-600 text-teal-900 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-100",
        MECH: "bg-rose-100 border-rose-300 border-l-rose-600 text-rose-900 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-100",
        MATH: "bg-fuchsia-100 border-fuchsia-300 border-l-fuchsia-600 text-fuchsia-900 dark:bg-fuchsia-900/30 dark:border-fuchsia-700 dark:text-fuchsia-100",
        DEFAULT: "bg-white border-slate-200 border-l-slate-400 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:border-l-slate-400 dark:text-slate-300"
    };

    let group = "DEFAULT";
    if (["0233", "0234", "0236", "0238"].includes(prefix)) group = "CS";
    else if (["0044", "0045", "0046", "0048", "0049", "0440"].includes(prefix)) group = "EE";
    else if (["0094", "0095", "0096", "0097", "0098", "0099"].includes(prefix)) group = "DATA";
    else if (["0084", "0085", "0086", "0088", "0738", "5208"].includes(prefix)) group = "AERO";
    else if (["0034", "0035", "0036", "0038", "0314", "0315", "0316", "0318", "0123", "0124", "0125", "0126", "0127", "0128", "0054", "0056", "0058"].includes(prefix)) group = "MECH";
    else if (["0014", "0015", "0016", "0017", "0018", "0019"].includes(prefix)) group = "CIVIL";
    else if (["0113", "0114", "0115", "0116", "0117", "0118"].includes(prefix)) group = "PHYS";
    else if (["0103", "0104", "0106", "0108", "0196", "0197", "0213", "0214", "0216", "0218"].includes(prefix)) group = "MATH";
    else if (["0064", "0066", "0068", "0134", "0136", "0138", "0274", "0275", "0276", "0277", "0278", "0334", "0335", "0336", "0337", "0338", "0648", "0204", "0205", "0206", "0207", "0208", "0209"].includes(prefix)) group = "BIO";

    const colorClass = COLORS[group];
    const baseStyle = "border-l-[4px] shadow-sm hover:shadow-md transition-all";

    if (highlightState === 'dimmed') return `${baseStyle} bg-slate-50 border-slate-100 opacity-20 grayscale border-l-slate-200 dark:bg-slate-900/50 dark:border-slate-800`;
    if (highlightState === 'focused') return `${baseStyle} ${colorClass} scale-[1.02] shadow-lg ring-2 ring-indigo-400 dark:ring-indigo-500 z-30`;
    if (highlightState === 'ancestor') return `${baseStyle} bg-blue-50 border-blue-400 ring-1 ring-blue-300 z-20 dark:bg-blue-900/30 dark:border-blue-500`;
    if (highlightState === 'descendant') return `${baseStyle} bg-amber-50 border-amber-400 ring-1 ring-amber-300 z-20 dark:bg-amber-900/30 dark:border-amber-500`;

    return `${baseStyle} ${colorClass}`;
};

// --- COMPONENTS ---
window.TrackSelectionModal = memo(({ isOpen, onClose, onSelectTrack }) => {
    // נשאר ללא שינוי, השארתי לקיצור
    if (!isOpen) return null;
    const [expandedFaculty, setExpandedFaculty] = useState(null);
    const toggleFaculty = (faculty) => setExpandedFaculty(expandedFaculty === faculty ? null : faculty);

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[80] backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <window.Icons.BookOpen size={24} className="text-indigo-600 dark:text-indigo-400"/>
                            בחר מסלול לימודים
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold p-2 bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors w-8 h-8 flex items-center justify-center">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-100 dark:bg-slate-900">
                    <div className="space-y-2">
                    {Object.entries(window.FACULTY_DATA).map(([facultyName, tracks]) => {
                        const isOpen = expandedFaculty === facultyName;
                        return (
                            <div key={facultyName} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button onClick={() => toggleFaculty(facultyName)} className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                    <span className="font-bold text-base">{facultyName}</span>
                                    {isOpen ? <window.Icons.ChevronUp size={20} /> : <window.Icons.ChevronDown size={20} className="text-slate-400" />}
                                </button>
                                {isOpen && (
                                    <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-t border-indigo-100 dark:border-slate-700 shadow-inner">
                                        {tracks.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {tracks.map((track) => (
                                                    <button key={track.id} onClick={() => onSelectTrack(track.id)} className="text-right px-4 py-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 flex items-center gap-3 bg-white dark:bg-slate-800">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div><span className="font-medium">{track.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : <div className="text-center text-slate-400 text-sm py-2">(אין מסלולים זמינים)</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    </div>
                </div>
            </div>
        </div>
    );
});

window.CourseCard = memo(({ course, highlightState, error, blockCount, onToggle, onEdit, onDelete, onDragStart, onHover, onLeave, onAddPrereq, getCourseName, setRef }) => {
    return (
        <div 
            ref={setRef}
            draggable 
            onDragStart={(e) => onDragStart(e, course)} 
            onMouseEnter={() => onHover(course)} 
            onMouseLeave={onLeave} 
            className={`relative p-3 pb-10 rounded-xl border select-none group course-card h-auto
                ${window.getFacultyColor(course.id, highlightState)} 
                ${error && !course.completed ? '!border-red-400 !bg-red-50 dark:!bg-red-900/20 dark:!border-red-500' : ''}
                ${course.completed ? '!bg-green-50 !border-green-400 dark:!bg-green-900/20 dark:!border-green-600' : ''} 
                overflow-hidden
            `}
        >
            <div className="flex justify-between items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm leading-tight ${course.completed ? 'line-through opacity-60' : ''}`} title={course.name}>{course.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-950/50 px-1.5 rounded text-slate-500 dark:text-slate-400 font-mono">{course.id}</span>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">{course.credits} נק'</span>
                        {blockCount > 2 && <div className="flex items-center gap-0.5 text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-900/40 px-1.5 rounded-full" title={`חוסם ${blockCount} קורסים בהמשך (נתיב קריטי)`}><window.Icons.Fire size={10}/> {blockCount}</div>}
                    </div>
                </div>
                <div className="flex flex-col gap-1 z-10">
                    <button onClick={(e) => { e.stopPropagation(); onToggle(course.id); }} className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${course.completed ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500' : 'border-slate-300 dark:border-slate-500 hover:border-indigo-400 bg-white dark:bg-slate-800'}`}>
                        {course.completed && <window.Icons.Check size={10} />}
                    </button>
                </div>
            </div>

            <div className="action-bar absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-600 px-3 py-1.5 flex items-center justify-between backdrop-blur-sm z-20">
                    <span className="text-[10px] text-slate-400 font-bold">פעולות:</span>
                    <div className="flex gap-3">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(course); }} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/50 px-2 py-0.5 rounded transition-colors"><window.Icons.Pencil size={12}/> ערוך</button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(course.id); }} className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/50 px-2 py-0.5 rounded transition-colors"><window.Icons.Trash2 size={12}/> מחק</button>
                    </div>
            </div>

            {error && !course.completed && (
                <div className="mt-1 text-[10px] text-red-600 dark:text-red-300 bg-red-100/50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800 flex items-center gap-1 flex-wrap">
                    <window.Icons.AlertCircle size={10} className="shrink-0" /> 
                    <span className="flex flex-wrap items-center gap-0.5">
                        {error.split(/(\d{8})/).map((part, i) => {
                            if (part.match(/^\d{8}$/)) {
                                return (
                                    <button 
                                        key={i} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onAddPrereq) onAddPrereq(part, course.semester - 1);
                                        }}
                                        className="underline font-bold hover:text-red-800 dark:hover:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/50 rounded px-0.5 transition-colors cursor-pointer"
                                        title={getCourseName ? `${getCourseName(part)}\nלחץ להוספת הקורס לסמסטר הקודם` : `לחץ להוספת הקורס ${part}`}
                                    >
                                        {part}
                                    </button>
                                );
                            }
                            return <span key={i}>{part}</span>;
                        })}
                    </span>
                </div>
            )}
        </div>
    );
});