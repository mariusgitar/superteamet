import { useState } from 'react';
import { EntryForm } from './components/EntryForm';
import { UserSelect } from './components/UserSelect';
import { WeekNav } from './components/WeekNav';
import { useCurrentUser } from './hooks/useCurrentUser';
import { weekStart } from './lib/utils';

export default function App() {
  const { user, saveUser } = useCurrentUser();
  const [currentWeekStart, setCurrentWeekStart] = useState(weekStart());

  if (!user) {
    return <UserSelect onSelect={saveUser} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold">Ukespeil</h1>
          <p className="text-sm text-slate-600">Hei, {user.name}</p>
        </header>

        <WeekNav currentWeekStart={currentWeekStart} onChangeWeek={setCurrentWeekStart} />
        <EntryForm type="plan" userId={user.id} weekStart={currentWeekStart} />
      </div>
    </main>
  );
}
