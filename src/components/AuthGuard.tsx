import { Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { convex, api, getToken } from '../lib/convex';

type AuthGuardProps = {
  children: React.ReactNode;
  roles?: string[];
  allowAdmin?: boolean;
};

type Status = 'checking' | 'ok' | 'denied';

/** Session is validated server-side (posAuth:whoami); localStorage flags are no longer trusted. */
export default function AuthGuard({ children, roles, allowAdmin = true }: AuthGuardProps) {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    convex
      .query(api.posAuth.whoami, { token: getToken() })
      .then((me) => {
        if (cancelled) return;
        if (!me) return setStatus('denied');
        const isAdminLogin = me.id === 'admin';
        if (isAdminLogin && allowAdmin) return setStatus('ok');
        if (!roles || roles.includes(me.role.toLowerCase())) return setStatus('ok');
        setStatus('denied');
      })
      .catch(() => {
        if (!cancelled) setStatus('denied');
      });
    return () => {
      cancelled = true;
    };
  }, [roles?.join(','), allowAdmin]);

  if (status === 'checking') return null;
  if (status === 'denied') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
