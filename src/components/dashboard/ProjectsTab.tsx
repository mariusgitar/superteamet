import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardProjectsResponse, User } from '../../types';
import { safeDate } from '../../lib/dashboard';
import { colorBgClass } from '../ProjectAdmin/colors';

export type Measurement = 'hours' | 'percent';

interface ProjectsTabProps {
  data: DashboardProjectsResponse;
  users: User[];
  selectedUserId: string | null;
  months: number | undefined;
  onMonthsChange: (months: number | undefined) => void;
}

export function ProjectsTab({ data, users, selectedUserId, months, onMonthsChange }: ProjectsTabProps) {
  const [measurement, setMeasurement] = useState<Measurement>('hours');
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const safeUsers = users ?? [];
  const monthly = data.monthly ?? [];
  const projects = data.projects ?? [];
  const visibleUsers = selectedUserId ? safeUsers.filter((user) => user.id === selectedUserId) : safeUsers;
  const userIds = new Set(visibleUsers.map((user) => user.id));
  const scoped = monthly.filter((item) => userIds.has(item.userId));
  const totalHours = scoped.reduce((sum, item) => sum + item.totalHours, 0);
  const bars = useMemo(() => projects.map((project) => {
    const hours = scoped.filter((item) => item.projectId === project.id).reduce((sum, item) => sum + item.totalHours, 0);
    return { ...project, hours, percent: totalHours ? Math.round(hours / totalHours * 100) : 0 };
  }).filter((project) => project.hours > 0).sort((a, b) => b.hours - a.hours), [projects, scoped, totalHours]);
  const maxValue = Math.max(1, ...bars.map((bar) => measurement === 'hours' ? bar.hours : bar.percent));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-sm text-slate-600">Periode
          <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" value={months ?? 0} onChange={(event) => onMonthsChange(Number(event.target.value) || undefined)}>
            <option value={1}>Denne måneden</option><option value={3}>Siste 3 måneder</option><option value={6}>Siste 6 måneder</option><option value={0}>Alt</option>
          </select>
        </label>
        <Toggle value={measurement} onChange={setMeasurement} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Total tid per prosjekt</h2>
        {bars.length === 0 ? <EmptyState /> : (
          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[520px] space-y-3">
              {(showAll ? bars : bars.slice(0, 10)).map((bar) => {
                const value = measurement === 'hours' ? bar.hours : bar.percent;
                const widthClass = widthToClass(value / maxValue);
                return <button className="group grid w-full grid-cols-[10rem_1fr_4rem] items-center gap-3 text-left" key={bar.id} onClick={() => setExpandedId(bar.id)} type="button">
                  <span className="truncate text-sm font-medium text-slate-700">{bar.name}</span>
                  <span className="h-7 overflow-hidden rounded-lg bg-slate-100"><span className={`block h-full rounded-lg ${widthClass} ${colorBgClass(bar.color)} opacity-80 transition group-hover:opacity-100`} /></span>
                  <span className="text-right text-sm font-semibold text-slate-900">{formatValue(value, measurement)}</span>
                </button>;
              })}
              {bars.length > 10 ? <button className="text-sm font-medium text-indigo-600" onClick={() => setShowAll((value) => !value)} type="button">{showAll ? 'Vis færre' : `Vis alle (${bars.length})`}</button> : null}
            </div>
          </div>
        )}
      </section>

      {expandedId ? <MonthlyBreakdown data={data} measurement={measurement} projectId={expandedId} users={visibleUsers} onClose={() => setExpandedId(null)} /> : null}
      <ContributorTable bars={bars} data={data} measurement={measurement} users={visibleUsers} />
    </div>
  );
}

export function Toggle({ value, onChange }: { value: Measurement; onChange: (value: Measurement) => void }) {
  return <div className="inline-flex rounded-full bg-slate-100 p-1">{(['hours', 'percent'] as const).map((item) => <button className={`rounded-full px-4 py-1.5 text-sm font-medium ${value === item ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} key={item} onClick={() => onChange(item)} type="button">{item === 'hours' ? 'Timer' : 'Prosent'}</button>)}</div>;
}

function MonthlyBreakdown({ data, measurement, projectId, users, onClose }: { data: DashboardProjectsResponse; measurement: Measurement; projectId: string; users: User[]; onClose: () => void }) {
  const safeUsers = users ?? [];
  const projects = data.projects ?? [];
  const monthly = data.monthly ?? [];
  const project = projects.find((item) => item.id === projectId);
  const months = [...new Set(monthly.map((item) => item.month))].filter((month) => safeDate(month)).sort();
  const chartData = months.map((month) => {
    const point: Record<string, string | number> = { month: monthLabel(month) };
    const values = safeUsers.map((user) => monthly.find((item) => item.month === month && item.projectId === projectId && item.userId === user.id)?.[measurement === 'hours' ? 'totalHours' : 'totalPercent'] ?? 0);
    safeUsers.forEach((user, index) => { point[user.id] = Math.round(values[index] * 10) / 10; });
    point.average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return point;
  });
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between"><h2 className="text-lg font-semibold">{project?.name ?? 'Prosjekt'} — månedlig fordeling</h2><button className="text-2xl text-slate-400 hover:text-slate-700" onClick={onClose} type="button" aria-label="Lukk">×</button></div><div className="mt-4 h-72"><ResponsiveContainer><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis unit={measurement === 'hours' ? 't' : '%'} /><Tooltip /><Legend />{safeUsers.map((user, index) => <Line dataKey={user.id} name={user.name} stroke={LINE_COLORS[index % LINE_COLORS.length]} strokeWidth={2} key={user.id} />)}<Line dataKey="average" name="Teamsnitt" stroke="#0f172a" strokeDasharray="5 4" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>;
}

function ContributorTable({ bars, data, measurement, users }: { bars: Array<{ id: string; name: string; hours: number }>; data: DashboardProjectsResponse; measurement: Measurement; users: User[] }) {
  const safeUsers = users ?? [];
  const monthly = data.monthly ?? [];
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Bidragsytere per prosjekt</h2><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead><tr className="text-left text-slate-500"><th className="p-3">Prosjekt</th>{safeUsers.map((user) => <th className="p-3" key={user.id}>{user.name}</th>)}<th className="p-3">Totalt</th></tr></thead><tbody className="divide-y divide-slate-100">{(bars ?? []).map((bar) => { const values = safeUsers.map((user) => monthly.filter((item) => item.projectId === bar.id && item.userId === user.id).reduce((sum, item) => sum + (measurement === 'hours' ? item.totalHours : item.totalPercent), 0)); return <tr key={bar.id}><td className="p-3 font-medium">{bar.name}</td>{values.map((value, index) => <td className="p-3 text-slate-600" key={safeUsers[index].id}>{formatValue(value, measurement)}</td>)}<td className="p-3 font-semibold">{formatValue(values.reduce((sum, value) => sum + value, 0), measurement)}</td></tr>; })}</tbody></table>{bars.length === 0 ? <p className="p-3 text-sm text-slate-500">Ingen prosjekter med registrerte timer i valgt periode.</p> : null}</div></section>;
}

function EmptyState() { return <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Ingen timer registrert i denne perioden.</div>; }
function formatValue(value: number, mode: Measurement) { const rounded = Math.round(value * 10) / 10; return `${rounded.toLocaleString('nb-NO')}${mode === 'hours' ? ' t' : '%'}`; }
function monthLabel(month: string) {
  const date = safeDate(month.length === 7 ? `${month}-01` : month);
  return date ? date.toLocaleDateString('nb-NO', { month: 'short', year: 'numeric' }) : '?';
}
function widthToClass(ratio: number) { if (ratio >= .875) return 'w-full'; if (ratio >= .75) return 'w-5/6'; if (ratio >= .625) return 'w-2/3'; if (ratio >= .375) return 'w-1/2'; if (ratio >= .2) return 'w-1/3'; return 'w-1/6'; }
const LINE_COLORS = ['#4f46e5', '#059669', '#e11d48', '#d97706', '#0891b2'];
