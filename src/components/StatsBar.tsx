interface StatsBarProps {
  totalCredits: number;
  completedCount: number;
  currentCourses: number;
  activeSemester: number;
}

export default function StatsBar({ totalCredits, completedCount, currentCourses, activeSemester }: StatsBarProps) {
  return (
    <div className="sticky-bar">
      <div>
        <h1>BananaBread Planner</h1>
        <p>ניהול תכנית לימודים עם גרירה רספונסיבית וטעינת מסלולים סטטית</p>
      </div>
      <div className="metric-list">
        <div className="metric">
          <strong>{currentCourses}</strong>
          <span>קורסים נוכחיים</span>
        </div>
        <div className="metric">
          <strong>{totalCredits}</strong>
          <span>נקודות</span>
        </div>
        <div className="metric">
          <strong>{completedCount}</strong>
          <span>הושלמו</span>
        </div>
        <div className="metric">
          <strong>{activeSemester}</strong>
          <span>סמסטרים</span>
        </div>
      </div>
    </div>
  );
}
