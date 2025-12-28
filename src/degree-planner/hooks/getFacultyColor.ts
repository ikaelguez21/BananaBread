const getFacultyColor = (id, highlightState) => {
  const cleanId = String(id).replace(/^0+/, '');
  const prefix = cleanId.substring(0, 2);

  let colorClass = '';
  // Colors: [Light Mode] / [Dark Mode]
  switch (prefix) {
    case '23':
      colorClass =
        'bg-emerald-50 border-emerald-200 border-l-emerald-600 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:border-l-emerald-500 dark:text-emerald-200';
      break;
    case '10':
      colorClass =
        'bg-blue-50 border-blue-200 border-l-blue-600 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:border-l-blue-500 dark:text-blue-200';
      break;
    case '11':
      colorClass =
        'bg-violet-50 border-violet-200 border-l-violet-600 text-violet-900 dark:bg-violet-950/40 dark:border-violet-800 dark:border-l-violet-500 dark:text-violet-200';
      break;
    case '04':
      colorClass =
        'bg-amber-50 border-amber-200 border-l-amber-600 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:border-l-amber-500 dark:text-amber-200';
      break;
    case '09':
      colorClass =
        'bg-fuchsia-50 border-fuchsia-200 border-l-fuchsia-600 text-fuchsia-900 dark:bg-fuchsia-950/40 dark:border-fuchsia-800 dark:border-l-fuchsia-500 dark:text-fuchsia-200';
      break;
    case '01':
      colorClass =
        'bg-orange-50 border-orange-200 border-l-orange-600 text-orange-900 dark:bg-orange-950/40 dark:border-orange-800 dark:border-l-orange-500 dark:text-orange-200';
      break;
    case '08':
      colorClass =
        'bg-sky-50 border-sky-200 border-l-sky-600 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:border-l-sky-500 dark:text-sky-200';
      break;
    case '12':
    case '13':
      colorClass =
        'bg-rose-50 border-rose-200 border-l-rose-600 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:border-l-rose-500 dark:text-rose-200';
      break;
    default:
      colorClass =
        'bg-white border-slate-200 border-l-slate-400 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:border-l-slate-400 dark:text-slate-300';
  }

  const baseStyle = 'border-l-[4px] shadow-sm hover:shadow-md transition-all';

  if (highlightState === 'dimmed')
    return `${baseStyle} bg-slate-50 border-slate-100 opacity-20 grayscale border-l-slate-200 dark:bg-slate-900/50 dark:border-slate-800`;
  if (highlightState === 'focused')
    return `${baseStyle} ${colorClass} scale-[1.02] shadow-lg ring-2 ring-indigo-400 dark:ring-indigo-500 z-30`;
  if (highlightState === 'ancestor')
    return `${baseStyle} bg-blue-50 border-blue-400 ring-1 ring-blue-300 z-20 dark:bg-blue-900/30 dark:border-blue-500`;
  if (highlightState === 'descendant')
    return `${baseStyle} bg-amber-50 border-amber-400 ring-1 ring-amber-300 z-20 dark:bg-amber-900/30 dark:border-amber-500`;

  return `${baseStyle} ${colorClass}`;
};

export default getFacultyColor;
