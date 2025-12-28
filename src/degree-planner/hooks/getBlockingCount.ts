const getBlockingCount = (courseId, allCourses) => {
  return allCourses.filter((c) => c.prereqs && c.prereqs.includes(courseId)).length;
};

export default getBlockingCount;
