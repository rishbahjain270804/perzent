'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, errorMessage, type SessionInfo } from '@/lib/client';

/** Loads GET /api/auth once; redirects to /login automatically on 401 via apiFetch. */
export function useSession() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<SessionInfo>('/api/auth');
      setSession(data);
      setError('');
    } catch (reason) {
      setError(errorMessage(reason, 'Could not load your workspace.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { session, loading, error, reload: load };
}
