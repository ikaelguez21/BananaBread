const getAllAncestors = (courseId, allCourses) => {
  const ancestors = new Set();
  try {
    const find = (cId, depth = 0) => {
      if (depth > 20) return;
      const course = allCourses.find((c) => c.id === cId);
      if (!course || !course.prereqs) return;
      course.prereqs.forEach((pId) => {
        if (!ancestors.has(pId)) {
          ancestors.add(pId);
          find(pId, depth + 1);
        }
      });
    };
    find(courseId);
  } catch (e) {
    console.warn('Ancestor finding error', e);
  }
  return ancestors;
};

export default getAllAncestors;
