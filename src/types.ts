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
  type: string;
  allocations: AllocationMap;
  hours?: AllocationMap;
  inputMode?: "slider" | "hours";
  daysAbsent?: number;
  totalHours?: number | null;
  submittedAt: string;
}

export interface WeekEntriesResponse {
  actual: WeekEntry | null;
}

export interface DashboardResponse {
  weeks: string[];
  projects: Project[];
  entries: WeekEntry[];
}

export interface DashboardWeekResponse {
  users: User[];
  projects: Project[];
  entries: WeekEntry[];
}

export interface DashboardProjectMonth {
  month: string;
  projectId: string;
  userId: string;
  totalHours: number;
  totalPercent: number;
  daysAbsent: number;
}

export interface ExportRow {
  weekLabel: string;
  weekStart: string;
  userName: string;
  projectName: string;
  hours: number;
  percent: number;
  availableHours: number;
  unregisteredHours: number;
  daysAbsent: number;
}

export interface ExportResponse { rows: ExportRow[]; }

export interface DashboardProjectsResponse {
  projects: Project[];
  monthly: DashboardProjectMonth[];
}

export interface GreetingResponse {
  greeting: string;
}
