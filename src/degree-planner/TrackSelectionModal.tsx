import { memo, useState } from 'react';

const TrackSelectionModal = memo(({ isOpen, onClose, onSelectTrack }) => {
  if (!isOpen) return null;
  const [expandedFaculty, setExpandedFaculty] = useState(null);
  const toggleFaculty = (faculty) =>
    setExpandedFaculty(expandedFaculty === faculty ? null : faculty);

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[80] backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Icons.BookOpen size={24} className="text-indigo-600 dark:text-indigo-400" />
            בחר מסלול לימודים
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold p-2 bg-slate-200/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors w-8 h-8 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-100 dark:bg-slate-900">
          <div className="space-y-2">
            {Object.entries(FACULTY_DATA).map(([facultyName, tracks]) => {
              const isOpen = expandedFaculty === facultyName;
              return (
                <div
                  key={facultyName}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaculty(facultyName)}
                    className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${isOpen ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                    <span className="font-bold text-base">{facultyName}</span>
                    {isOpen ? (
                      <Icons.ChevronUp size={20} />
                    ) : (
                      <Icons.ChevronDown size={20} className="text-slate-400" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-t border-indigo-100 dark:border-slate-700 shadow-inner">
                      {tracks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tracks.map((track) => (
                            <button
                              key={track.id}
                              onClick={() => onSelectTrack(track.id)}
                              className="text-right px-4 py-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-700 hover:shadow-md transition-all border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-500/50 flex items-center gap-3 bg-white dark:bg-slate-800"
                            >
                              <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0"></div>
                              <span className="font-medium">{track.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 text-sm py-2">
                          (אין מסלולים זמינים)
                        </div>
                      )}
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

export default TrackSelectionModal;
