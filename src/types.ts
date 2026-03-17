export type EntryType = 'plan' | 'actual';

export interface User {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export type AllocationMap = Record<string, number>;

export interface WeekEntry {
  id: string;
  userId: string;
  weekStart: string;
  type: EntryType;
  allocations: AllocationMap;
  submittedAt: string;
}

export interface WeekEntriesResponse {
  plan: WeekEntry | null;
  actual: WeekEntry | null;
}

export interface DashboardResponse {
  weeks: string[];
  projects: Project[];
  entries: WeekEntry[];
}

export interface ExportRow {
  week_start: string;
  week_label: string;
  user_name: string;
  project_name: string;
  percent: number;
  hours: number;
}
