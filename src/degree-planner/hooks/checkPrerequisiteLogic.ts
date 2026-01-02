import normalizeId from './normalizeId.ts';

const checkPrerequisiteLogic = (prereqString, targetSemester, currentCourses) => {
  if (!prereqString || typeof prereqString !== 'string' || !prereqString.trim()) return true;
  try {
    const courseIds = prereqString.match(/\d{6,8}/g);
    if (!courseIds) return true;

    const completionMap = {};
    courseIds.forEach((id) => {
      const normalizedId = normalizeId(id);
      const courseInBoard = currentCourses.find((c) => c.id === normalizedId);

      completionMap[id] =
        (courseInBoard && courseInBoard.completed) ||
        (courseInBoard && courseInBoard.semester < targetSemester);
    });

    let cleanStr = prereqString
      // eslint-disable-next-line no-misleading-character-class
      .replace(/א[וֹ]/g, '||')
      .replace(/\sOR\s/gi, '||')
      .replace(/וגם/g, '&&')
      .replace(/\sAND\s/gi, '&&')
      .replace(/[[{]/g, '(')
      .replace(/[\]}]/g, ')');

    const ids = Object.keys(completionMap).sort((a, b) => b.length - a.length);
    ids.forEach((id) => {
      cleanStr = cleanStr.split(id).join(completionMap[id].toString());
    });

    const safeEvalStr = cleanStr.replace(/[^truefals()&|!\s]/gi, '');
    const result = new Function(`return (${safeEvalStr});`)();
    return !!result;
  } catch {
    const values = Object.values(completionMap || {});
    const completedCount = values.filter((v) => v === true).length;
    const requiredCount = values.length;
    return requiredCount > 1 && completedCount > 0;
  }
};

export default checkPrerequisiteLogic;
