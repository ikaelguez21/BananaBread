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
    .replace(/\u00A0/g, ' ')
    .trim();

  const courseIds = Array.from(new Set(normalizedExpr.match(/\d{8}/g) || []));
  const missingIds: string[] = [];

  const checkSatisfied = (courseId: string, semesterCheck: number) => {
    const normalized = normalizeId(courseId);
    const course = currentCourses.find((item) => normalizeId(item.id) === normalized);
    const satisfied = Boolean(course && (course.completed || course.semester < semesterCheck));
    if (!course && semesterCheck === targetSemester) {
      missingIds.push(normalized);
    }
    return satisfied;
  };

  let expression = normalizedExpr;
  courseIds.forEach((rawId) => {
    const value = checkSatisfied(rawId, targetSemester);
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

  const logicString = courseIds.reduce((result, id) => {
    const satisfied = checkSatisfied(id, targetSemester);
    return result.replace(new RegExp(`\\b${id}\\b`, 'g'), satisfied ? '✔' : id);
  }, normalizedExpr);

  return { isSatisfied, missingIds: Array.from(new Set(missingIds)), logicString };
}

export function formatMissingIds(missing: string[]): string {
  if (!missing.length) return '';
  return missing.join(', ');
}
