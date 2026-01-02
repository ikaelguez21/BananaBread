import checkPrerequisiteLogic from './checkPrerequisiteLogic.ts';

const checkPrerequisiteError = (course, allCourses) => {
  try {
    if (course.prereqString) {
      if (checkPrerequisiteLogic(course.prereqString, course.semester, allCourses)) return null;
      return 'דרישות הקדם לא הושלמו';
    }
    if (!course.prereqs || !Array.isArray(course.prereqs)) return null;
    const missing = course.prereqs.filter((pid) => {
      const pre = allCourses.find((c) => c.id === pid);
      return !pre || (!pre.completed && pre.semester >= course.semester);
    });
    return missing.length > 0 ? 'חסרים קדמים' : null;
  } catch {
    return null;
  }
};

export default checkPrerequisiteError;
