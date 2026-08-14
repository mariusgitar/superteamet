import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardResponse, Project, User, WeekEntry } from '../../types';
import { safeDate, type DonutCardData } from '../../lib/dashboard';
import { WeeklyDonuts } from './WeeklyDonuts';
import { Toggle, type Measurement } from './ProjectsTab';

type PersonalPeriod = 4 | 12 | 0;

interface MeTabProps { entries: WeekEntry[]; team: DashboardResponse; users: User[]; currentUser: User; }

export function MeTab({ entries, team, users, currentUser }: MeTabProps) {
  const [period, setPeriod] = useState<PersonalPeriod>(12);
  const [measurement, setMeasurement] = useState<Measurement>('hours');
  const safeEntries = entries ?? [];
  const teamEntries = team.entries ?? [];
  const projects = team.projects ?? [];
  const safeUsers = users ?? [];
  const filteredMine = filterPeriod(safeEntries, period);
  const filteredTeam = filterPeriod(teamEntries, period);
  const donuts = useMemo(() => buildAllocationDonuts(filteredMine, filteredTeam, projects, safeUsers, currentUser), [filteredMine, filteredTeam, projects, safeUsers, currentUser]);
  const topProjectIds = topProjects(filteredMine).slice(0, 5);
  const trend = buildTrend(filteredMine, projects, topProjectIds, measurement, period === 4);
  const lastTwelve = [...safeEntries].filter(isHoursEntry).filter((entry) => safeDate(entry.weekStart)).sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-12);

  return <div className="space-y-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold">Min fordeling vs. teamsnitt</h2><select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value={period} onChange={(event) => setPeriod(Number(event.target.value) as PersonalPeriod)}><option value={4}>Siste 4 uker</option><option value={12}>Siste 3 måneder</option><option value={0}>Alt</option></select></div>
      <div className="mt-4"><WeeklyDonuts cards={donuts} layout="comparison" /></div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-lg font-semibold">Mine prosjekter over tid</h2><Toggle value={measurement} onChange={setMeasurement} /></div>
      {trend.length ? <div className="mt-4 h-80"><ResponsiveContainer><LineChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis unit={measurement === 'hours' ? 't' : '%'} /><Tooltip /><Legend />{topProjectIds.map((id, index) => <Line dataKey={id} key={id} name={projects.find((project) => project.id === id)?.name ?? 'Prosjekt'} stroke={COLORS[index]} strokeWidth={2} />)}</LineChart></ResponsiveContainer></div> : <Empty />}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Min uregistrerte tid over tid</h2>
      {lastTwelve.length ? <div className="mt-4 h-80 overflow-x-auto"><div className="h-full min-w-[620px]"><ResponsiveContainer><BarChart data={lastTwelve.map((entry) => ({ ...entry.hours, week: weekLabel(entry.weekStart), unregistered: Math.max(0, 37.5 - total(entry)) }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis domain={[0, 40]} unit="t" /><Tooltip /><Legend />{topProjects(lastTwelve).map((id, index) => <Bar dataKey={id} stackId="time" name={projects.find((project) => project.id === id)?.name ?? 'Prosjekt'} fill={COLORS[index % COLORS.length]} key={id} />)}<Bar dataKey="unregistered" name="Uregistrert" stackId="time" fill="#cbd5e1" /><ReferenceLine y={37.5} stroke="#475569" strokeDasharray="4 4" /></BarChart></ResponsiveContainer></div></div> : <Empty />}
    </section>
    <TeamComparison entries={filteredMine} teamEntries={filteredTeam} projects={projects} users={safeUsers} currentUser={currentUser} />
  </div>;
}

function TeamComparison({ entries, teamEntries, projects, users, currentUser }: { entries: WeekEntry[]; teamEntries: WeekEntry[]; projects: Project[]; users: User[]; currentUser: User }) {
  const ids = [...new Set(teamEntries.flatMap((entry) => Object.keys(entry.hours ?? {})))];
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Sammenligning med teamet</h2><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Prosjekt</th><th className="p-3">Meg</th><th className="p-3">Team snitt</th><th className="p-3">Diff</th></tr></thead><tbody className="divide-y divide-slate-100">{ids.map((id) => { const mine = sumProject(entries, id); const teamValues = users.filter((user) => user.id !== currentUser.id).map((user) => sumProject(teamEntries.filter((entry) => entry.userId === user.id), id)); const average = teamValues.length ? teamValues.reduce((sum, value) => sum + value, 0) / teamValues.length : 0; const diff = mine - average; return <tr key={id}><td className="p-3 font-medium">{projects.find((project) => project.id === id)?.name ?? 'Ukjent prosjekt'}</td><td className="p-3">{formatHours(mine)}</td><td className="p-3">{formatHours(average)}</td><td className={`p-3 font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{diff > 0 ? '+' : ''}{formatHours(diff)}</td></tr>; })}</tbody></table>{ids.length === 0 ? <Empty /> : null}</div></section>;
}

function buildAllocationDonuts(mine: WeekEntry[], team: WeekEntry[], projects: Project[], users: User[], current: User): DonutCardData[] {
  const card = (name: string, source: WeekEntry[], divisor: number): DonutCardData => { const values = new Map<string, number>(); source.filter(isHoursEntry).forEach((entry) => Object.entries(entry.hours ?? {}).forEach(([id, value]) => values.set(id, (values.get(id) ?? 0) + value / divisor))); const slices = [...values].map(([id, value]) => ({ id, value, name: projects.find((project) => project.id === id)?.name ?? 'Prosjekt', color: projects.find((project) => project.id === id)?.color ?? '#94a3b8' })).sort((a, b) => b.value - a.value); return { user: { id: name, name }, totalHours: slices.reduce((sum, item) => sum + item.value, 0), hasData: slices.length > 0, slices: slices.length ? slices.slice(0, 5) : [{ id: 'empty', name: 'Ingen data', color: '#e2e8f0', value: 1 }], legendItems: slices.slice(0, 3), emptyMessage: 'Ingen registreringer i perioden.' }; };
  return [card(current.name, mine, 1), card('Teamsnitt', team, Math.max(1, users.length))];
}

function buildTrend(entries: WeekEntry[], projects: Project[], ids: string[], measurement: Measurement, weekly: boolean) { const groups = new Map<string, WeekEntry[]>(); entries.filter(isHoursEntry).filter((entry) => safeDate(entry.weekStart)).forEach((entry) => { const key = weekly ? entry.weekStart : entry.weekStart.slice(0, 7); groups.set(key, [...(groups.get(key) ?? []), entry]); }); return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([key, values]) => { const point: Record<string, string | number> = { label: weekly ? weekLabel(key) : monthLabel(key) }; const sum = values.reduce((acc, entry) => acc + total(entry), 0); ids.forEach((id) => { const hours = sumProject(values, id); point[id] = measurement === 'hours' ? hours : (sum ? Math.round(hours / sum * 100) : 0); }); return point; }); }
function filterPeriod(entries: WeekEntry[], weeks: PersonalPeriod) {
  const actual = entries.filter(isHoursEntry);
  if (weeks === 0 || actual.length === 0) return actual;
  const latest = [...actual].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0].weekStart;
  const cutoff = safeDate(latest);
  if (!cutoff) return [];
  cutoff.setDate(cutoff.getDate() - (weeks - 1) * 7);
  return actual.filter((entry) => {
    const date = safeDate(entry.weekStart);
    return date !== null && date >= cutoff;
  });
}
function isHoursEntry(entry: WeekEntry) { return entry.type === 'actual' && entry.inputMode === 'hours' && entry.hours; }
function topProjects(entries: WeekEntry[]) { const ids = [...new Set(entries.flatMap((entry) => Object.keys(entry.hours ?? {})))]; return ids.sort((a, b) => sumProject(entries, b) - sumProject(entries, a)); }
function sumProject(entries: WeekEntry[], id: string) { return entries.reduce((sum, entry) => sum + (entry.hours?.[id] ?? 0), 0); }
function total(entry: WeekEntry) { return Object.values(entry.hours ?? {}).reduce((sum, value) => sum + value, 0); }
function formatHours(value: number) { return `${(Math.round(value * 10) / 10).toLocaleString('nb-NO')} t`; }
function weekLabel(value: string) { const date = safeDate(value); return date ? date.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' }) : 'Ukjent'; }
function monthLabel(value: string) { const date = safeDate(value.length === 7 ? `${value}-01` : value); return date ? date.toLocaleDateString('nb-NO', { month: 'short' }) : '?'; }
function Empty() { return <p className="p-6 text-center text-sm text-slate-500">Ingen timer registrert i valgt periode.</p>; }
const COLORS = ['#4f46e5', '#059669', '#e11d48', '#d97706', '#0891b2'];
