import { useState, useEffect, useCallback } from 'react';
import { fetchUserAttributes, getCurrentUser, updateUserAttributes } from 'aws-amplify/auth';
import { amplifyDataClient } from '@/amplifyDataClient';

export interface UserProfileState {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
}

export interface UseUserProfileResult {
  profile: UserProfileState | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateAvatarUrl: (url: string | null) => Promise<void>;
}

/**
 * Loads `User` from Data (owner-scoped) and Cognito attributes for the signed-in user.
 */
export function useUserProfile(): UseUserProfileResult {
  const [profile, setProfile] = useState<UserProfileState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      const list = await (amplifyDataClient.models as any).User.list({ authMode: 'userPool' });
      const row = (list.data ?? [])[0] as
        | { id: string; name: string; email: string; role: string; avatarUrl?: string | null }
        | undefined;

      const email = attrs.email ?? row?.email ?? '';
      const name = attrs.name ?? row?.name ?? u.signInDetails?.loginId ?? email.split('@')[0];

      setProfile({
        id: row?.id ?? u.userId,
        name,
        email,
        avatarUrl: row?.avatarUrl ?? null,
        role: row?.role ?? (attrs['custom:role'] as string) ?? 'CUSTOMER',
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load profile'));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateName = useCallback(
    async (name: string) => {
      setSaving(true);
      try {
        await updateUserAttributes({ userAttributes: { name } });
        const list = await (amplifyDataClient.models as any).User.list({ authMode: 'userPool' });
        const row = (list.data ?? [])[0];
        if (row?.id) {
          await (amplifyDataClient.models as any).User.update(
            { id: row.id, name },
            { authMode: 'userPool' }
          );
        }
        setProfile((p) => (p ? { ...p, name } : p));
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const updateAvatarUrl = useCallback(async (url: string | null) => {
    setSaving(true);
    try {
      const list = await (amplifyDataClient.models as any).User.list({ authMode: 'userPool' });
      const row = (list.data ?? [])[0];
      if (row?.id) {
        await (amplifyDataClient.models as any).User.update(
          { id: row.id, avatarUrl: url },
          { authMode: 'userPool' }
        );
      }
      setProfile((p) => (p ? { ...p, avatarUrl: url } : p));
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    profile,
    loading,
    saving,
    error,
    refetch: load,
    updateName,
    updateAvatarUrl,
  };
}
