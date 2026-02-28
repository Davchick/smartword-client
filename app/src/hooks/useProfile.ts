import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  is_premium: boolean;
  ai_messages_used: number;
  created_at: string;
}

const AVATAR_KEY = 'smartword_avatar_id';
const NICKNAME_KEY = 'smartword_nickname';

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarId, setAvatarIdState] = useState<number>(0);
  const [nickname, setNicknameState] = useState<string>('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();

    // Загружаем локальные данные профиля
    AsyncStorage.multiGet([AVATAR_KEY, NICKNAME_KEY]).then((pairs) => {
      const avatarVal = pairs[0][1];
      const nicknameVal = pairs[1][1];
      if (avatarVal !== null) setAvatarIdState(parseInt(avatarVal, 10));
      if (nicknameVal !== null) setNicknameState(nicknameVal);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await AsyncStorage.removeItem('smartword_guest_mode');
        fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const setAvatarId = useCallback((id: number) => {
    setAvatarIdState(id);
    AsyncStorage.setItem(AVATAR_KEY, String(id));
  }, []);

  const setNickname = useCallback((name: string) => {
    setNicknameState(name);
    AsyncStorage.setItem(NICKNAME_KEY, name);
  }, []);

  return { profile, loading, refetch: fetchProfile, avatarId, setAvatarId, nickname, setNickname };
};
