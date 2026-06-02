import type { PlannerCourse } from '../types';

export function normalizeId(id: string): string {
  return String(id).trim().padStart(8, '0');
}

export interface PrereqAnalysisResult {
  isSatisfied: boolean;
  missingIds: string[];
  logicString: string;
}

export function analyzePrerequisites(prereqString: string, targetSemester: number, currentCourses: PlannerCourse[]): PrereqAnalysisResult {
  if (!prereqString || !prereqString.trim()) {
    return { isSatisfied: true, missingIds: [], logicString: '' };
  }

  const normalizedExpr = prereqString
    .replace(/\s+/g, ' ')
    .replace(/\bOR\b/gi, ' || ')
    .replace(/\bAND\b/gi, ' && ')
    .replace(/ /g, ' ')
    .trim();

  const courseIds = Array.from(new Set(normalizedExpr.match(/\d{8}/g) || []));
  const satisfiedMap = new Map<string, boolean>();

  const checkSatisfied = (courseId: string): boolean => {
    const normalized = normalizeId(courseId);
    if (satisfiedMap.has(normalized)) return satisfiedMap.get(normalized)!;
    const course = currentCourses.find((item) => normalizeId(item.id) === normalized);
    const satisfied = Boolean(course && (course.completed || course.semester < targetSemester));
    satisfiedMap.set(normalized, satisfied);
    return satisfied;
  };

  let expression = normalizedExpr;
  courseIds.forEach((rawId) => {
    const value = checkSatisfied(rawId);
    const safeId = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    expression = expression.replace(new RegExp(`\\b${safeId}\\b`, 'g'), String(value));
  });

  const safeExpression = expression.replace(/[^truefalsenegx\|\&\(\)\s!]/g, '');
  let isSatisfied = true;
  try {
    if (safeExpression.trim()) {
      // eslint-disable-next-line no-new-func
      isSatisfied = Function(`return (${safeExpression});`)();
    }
  } catch {
    isSatisfied = true;
  }

  const missingIds = courseIds
    .map(normalizeId)
    .filter((id) => !(satisfiedMap.get(id) ?? false));

  const logicString = courseIds.reduce((result, id) => {
    const satisfied = satisfiedMap.get(normalizeId(id)) ?? false;
    return result.replace(new RegExp(`\\b${id}\\b`, 'g'), satisfied ? '✔' : id);
  }, normalizedExpr);

  return { isSatisfied, missingIds, logicString };
}
