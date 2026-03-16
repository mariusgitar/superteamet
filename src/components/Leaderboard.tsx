import type { User } from '../types';
import { avatarColorClass, buildLeaderboard, initials, type LeaderMetric } from '../lib/gamification';
import type { WeekEntry } from '../types';

interface LeaderboardProps {
  users: User[];
  entries: WeekEntry[];
}

interface LeaderboardCardProps {
  label: string;
  leaders: LeaderMetric[];
  usersById: Map<string, User>;
  suffix: (value: number) => string;
}

function LeaderboardCard({ label, leaders, usersById, suffix }: LeaderboardCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-sm font-medium text-slate-500">{label}</p>
      <div className="space-y-3">
        {leaders.length === 0 ? <p className="text-sm text-slate-500">Ikke nok data ennå.</p> : null}
        {leaders.map((leader) => {
          const user = usersById.get(leader.userId);
          if (!user) {
            return null;
          }

          return (
            <div className="flex items-center gap-3" key={leader.userId}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorClass(user.name)}`}>
                {initials(user.name)}
              </div>
              <div>
                <p className="font-medium text-slate-800">{user.name} 👑</p>
                <p className="text-sm text-slate-600">{suffix(leader.value)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function Leaderboard({ users, entries }: LeaderboardProps) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const leaderboard = buildLeaderboard(entries, users);

  return (
    <section className="grid gap-3 md:grid-cols-3">
      <LeaderboardCard
        label="Lengst streak 🔥"
        leaders={leaderboard.streakLeaders}
        suffix={(value) => `${value} uker på rad`}
        usersById={usersById}
      />
      <LeaderboardCard
        label="Best treffsikkerhet 👍"
        leaders={leaderboard.bestAccuracyLeaders}
        suffix={(value) => `${value}% snitt siste 4 uker`}
        usersById={usersById}
      />
      <LeaderboardCard
        label="Mest konsistent 📋"
        leaders={leaderboard.consistentLeaders}
        suffix={(value) => `${value} uker levert`}
        usersById={usersById}
      />
    </section>
  );
}
