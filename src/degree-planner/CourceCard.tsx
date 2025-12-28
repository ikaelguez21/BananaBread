import { memo } from 'react';

const CourseCard = memo(
  ({
    course,
    highlightState,
    error,
    blockCount,
    onToggle,
    onEdit,
    onDelete,
    onDragStart,
    onHover,
    onLeave,
    setRef
  }) => {
    return (
      <div
        ref={setRef}
        draggable
        onDragStart={(e) => onDragStart(e, course)}
        onMouseEnter={() => onHover(course)}
        onMouseLeave={onLeave}
        className={`relative p-3 rounded-xl border select-none group course-card
                    ${getFacultyColor(course.id, highlightState)} 
                    ${error && !course.completed ? '!border-red-400 !bg-red-50 dark:!bg-red-900/20 dark:!border-red-500' : ''}
                    ${course.completed ? '!bg-green-50 !border-green-400 dark:!bg-green-900/20 dark:!border-green-600' : ''} 
                    overflow-hidden
                `}
      >
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4
              className={`font-bold text-sm leading-tight truncate ${course.completed ? 'line-through opacity-60' : ''}`}
              title={course.name}
            >
              {course.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-slate-100 dark:bg-slate-950/50 px-1.5 rounded text-slate-500 dark:text-slate-400 font-mono">
                {course.id}
              </span>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                {course.credits} נק'
              </span>
              {blockCount > 2 && (
                <div
                  className="flex items-center gap-0.5 text-[10px] text-orange-600 dark:text-orange-400 font-bold bg-orange-100 dark:bg-orange-900/40 px-1.5 rounded-full"
                  title={`חוסם ${blockCount} קורסים בהמשך (נתיב קריטי)`}
                >
                  <Icons.Fire size={10} /> {blockCount}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(course.id);
              }}
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${course.completed ? 'bg-green-500 border-green-600 dark:bg-green-600 dark:border-green-500' : 'border-slate-300 dark:border-slate-500 hover:border-indigo-400 bg-white dark:bg-slate-800'}`}
            >
              {course.completed && <Icons.Check size={10} />}
            </button>
          </div>
        </div>

        {/* SLIDE-UP ACTION BAR */}
        <div className="action-bar absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-800/95 border-t border-slate-200 dark:border-slate-600 px-3 py-1.5 flex items-center justify-between backdrop-blur-sm z-20">
          <span className="text-[10px] text-slate-400 font-bold">פעולות:</span>
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(course);
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/50 px-2 py-0.5 rounded transition-colors"
            >
              <Icons.Pencil size={12} /> ערוך
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(course.id);
              }}
              className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/50 px-2 py-0.5 rounded transition-colors"
            >
              <Icons.Trash2 size={12} /> מחק
            </button>
          </div>
        </div>

        {error && !course.completed && (
          <div className="mt-1 text-[10px] text-red-600 dark:text-red-300 bg-red-100/50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800 flex items-center gap-1">
            <Icons.AlertCircle size={10} />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    );
  }
);

export default CourseCard;
