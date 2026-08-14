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

export interface GreetingResponse {
  greeting: string;
}
