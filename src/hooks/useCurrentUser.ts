import { useEffect, useState } from 'react';
import type { User } from '../types';

const STORAGE_KEY = 'ukespeil_user';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return;

    try {
      const parsed = JSON.parse(value) as User;
      if (parsed.id && parsed.name) {
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveUser = (nextUser: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return { user, saveUser };
}
