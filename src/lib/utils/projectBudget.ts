import { Project } from '@/src/types/firestore';

/**
 * Standard project budget formatter across Client and Specialist portals.
 * Accurately represents fixed vs hourly compensation structures.
 */
export function formatProjectBudget(project?: Partial<Project> | null): string {
  if (!project) return 'Flexible Budget';

  const isHourly = project.budgetType === 'hourly' || (project as any).pricingModel === 'hourly';

  if (isHourly) {
    if (project.minBudget && project.maxBudget) {
      return `$${Number(project.minBudget).toLocaleString()} – $${Number(project.maxBudget).toLocaleString()}/hr`;
    }
    if (project.maxBudget) {
      return `$${Number(project.maxBudget).toLocaleString()}/hr`;
    }
    if (project.minBudget) {
      return `From $${Number(project.minBudget).toLocaleString()}/hr`;
    }
    return 'Hourly Rate';
  }

  // Fixed budget
  if (typeof project.budget === 'number' && project.budget > 0) {
    return `$${Number(project.budget).toLocaleString()}`;
  }
  if (typeof project.budget === 'object' && project.budget?.total) {
    return `$${Number(project.budget.total).toLocaleString()}`;
  }
  if (project.minBudget && project.maxBudget) {
    return `$${Number(project.minBudget).toLocaleString()} – $${Number(project.maxBudget).toLocaleString()}`;
  }
  if (project.maxBudget) {
    return `$${Number(project.maxBudget).toLocaleString()}`;
  }
  if (project.minBudget) {
    return `From $${Number(project.minBudget).toLocaleString()}`;
  }

  return 'Fixed Price';
}

/**
 * Returns human-readable billing model label (e.g. "Fixed Price" or "Hourly Rate").
 */
export function getProjectBillingModel(project?: Partial<Project> | null): string {
  if (!project) return 'Standard Contract';
  const isHourly = project.budgetType === 'hourly' || (project as any).pricingModel === 'hourly';
  return isHourly ? 'Hourly Rate' : 'Fixed Price';
}

/**
 * Cleans ugly "[PreSync AI Brief]" prefixes from project titles for display.
 */
export function getCleanProjectTitle(title?: string): string {
  if (!title) return 'Untitled Project';
  return title
    .replace(/^\[PreSync\s+AI\s+Brief\]\s*/i, '')
    .replace(/^PreSync\s+AI\s+Brief:\s*/i, '')
    .trim() || 'Untitled Project';
}

/**
 * Checks whether the project was generated with or has an attached PreSync AI brief.
 */
export function isAiBriefProject(project?: Partial<Project> | null): boolean {
  if (!project) return false;
  return Boolean(
    project.aiBriefAttached ||
    project.aiBrief ||
    (typeof project.title === 'string' && /\[PreSync\s+AI\s+Brief\]/i.test(project.title))
  );
}
