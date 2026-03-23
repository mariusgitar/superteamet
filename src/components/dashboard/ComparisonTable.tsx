import type { ComparisonRow } from '../../lib/dashboard';
import type { User } from '../../types';

interface ComparisonTableProps {
  rows: ComparisonRow[];
  users: User[];
}

export function ComparisonTable({ rows, users }: ComparisonTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Ingen prosjekter med registrerte timer i valgt periode.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="px-3 py-3 font-medium">Prosjekt</th>
            {users.map((user) => (
              <th className="px-3 py-3 font-medium" key={user.id}>{user.name}</th>
            ))}
            <th className="px-3 py-3 font-medium">Snitt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.projectId}>
              <td className="px-3 py-3 font-medium text-slate-900">{row.projectName}</td>
              {users.map((user) => (
                <td className="px-3 py-3 text-slate-600" key={user.id}>{row.values[user.id] === null ? '—' : formatHours(row.values[user.id] ?? 0)}</td>
              ))}
              <td className="px-3 py-3 text-slate-900">{formatHours(row.average)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatHours(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1).replace('.', ',')}t`;
}
