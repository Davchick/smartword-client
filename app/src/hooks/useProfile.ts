import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet, getBaseUrl } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export interface Profile {
  id: string;
  is_premium: boolean;
  ai_messages_used: number;
  created_at: string;
}

const AVATAR_KEY = 'smartword_avatar_id';
const NICKNAME_KEY = 'smartword_nickname';

export const useProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarIdState] = useState<number>(0);
  const [nickname, setNicknameState] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    if (!getBaseUrl() || !authUser) {
      setProfile(authUser ? { id: authUser.id, is_premium: authUser.is_premium, ai_messages_used: authUser.ai_messages_used, created_at: authUser.created_at } : null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet<Profile>('/profile');
      setProfile(data);
    } catch (e) {
      console.warn('[useProfile] fetchProfile error', e);
      setProfile(authUser ? { id: authUser.id, is_premium: authUser.is_premium, ai_messages_used: authUser.ai_messages_used, created_at: authUser.created_at } : null);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [authUser?.id]);

  useEffect(() => {
    AsyncStorage.multiGet([AVATAR_KEY, NICKNAME_KEY]).then((pairs) => {
      const avatarVal = pairs[0][1];
      const nicknameVal = pairs[1][1];
      if (avatarVal !== null) setAvatarIdState(parseInt(avatarVal, 10));
      if (nicknameVal !== null) setNicknameState(nicknameVal);
    });
  }, []);

  const setAvatarId = useCallback((id: number) => {
    setAvatarIdState(id);
    AsyncStorage.setItem(AVATAR_KEY, String(id));
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    AsyncStorage.setItem(NICKNAME_KEY, name);
  }, []);

  const profileOrFromAuth: Profile | null = profile ?? (authUser ? {
    id: authUser.id,
    is_premium: authUser.is_premium,
    ai_messages_used: authUser.ai_messages_used,
    created_at: authUser.created_at,
  } : null);

  return {
    profile: profileOrFromAuth,
    loading,
    refetch: fetchProfile,
    avatarId,
    setAvatarId,
    nickname,
    setNickname,
  };
};
