import type { DashboardResponse, EntryType, Project, User, WeekEntriesResponse, WeekEntry } from '../types';

const API_SECRET = import.meta.env.VITE_API_SECRET;
const BASE = import.meta.env.DEV ? 'http://localhost:8888/.netlify/functions' : '/.netlify/functions';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorData?.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getUsers(): Promise<User[]> {
  return request<User[]>(`${BASE}/users`);
}

export function getProjects(): Promise<Project[]> {
  return request<Project[]>(`${BASE}/projects`);
}

export function getAllProjects(): Promise<Project[]> {
  return request<Project[]>(`${BASE}/projects?includeArchived=true`);
}

export function createProject(input: { name: string; color: string }): Promise<Project> {
  return request<Project>(`${BASE}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': API_SECRET,
    },
    body: JSON.stringify(input),
  });
}

export function updateProject(projectId: string, input: { name?: string; color?: string; active?: boolean }): Promise<Project> {
  return request<Project>(`${BASE}/projects?id=${projectId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': API_SECRET,
    },
    body: JSON.stringify(input),
  });
}

export function getWeekEntries(userId: string, start: string): Promise<WeekEntriesResponse> {
  const query = new URLSearchParams({ userId, weekStart: start }).toString();
  return request<WeekEntriesResponse>(`${BASE}/entries?${query}`);
}

export function getActualHistory(userId: string): Promise<WeekEntry[]> {
  const query = new URLSearchParams({ userId, limit: '20', type: 'actual' }).toString();
  return request<WeekEntry[]>(`${BASE}/entries?${query}`);
}

export function getRecentEntries(userId: string, limit = 20): Promise<WeekEntry[]> {
  const query = new URLSearchParams({ userId, limit: String(limit) }).toString();
  return request<WeekEntry[]>(`${BASE}/entries?${query}`);
}

interface DashboardQueryInput {
  weeks?: number;
  weekStart?: string;
}

export function getDashboard(input: DashboardQueryInput): Promise<DashboardResponse> {
  const query = new URLSearchParams();

  if (input.weekStart) {
    query.set('weekStart', input.weekStart);
  }

  if (input.weeks) {
    query.set('weeks', String(input.weeks));
  }

  return request<DashboardResponse>(`${BASE}/dashboard?${query.toString()}`);
}

interface UpsertEntryInput {
  userId: string;
  weekStart: string;
  type: EntryType;
  allocations: Record<string, number>;
}

export function upsertEntry(input: UpsertEntryInput): Promise<WeekEntry> {
  return request<WeekEntry>(`${BASE}/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': API_SECRET,
    },
    body: JSON.stringify(input),
  });
}
