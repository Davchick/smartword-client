export interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'words' | 'swipe' | 'chat';
  threshold: number;
  points: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AchievementsSummary {
  total: number;
  unlocked: number;
  totalPoints: number;
  categoryProgress: {
    [key: string]: {
      unlocked: number;
      total: number;
      percentage: number;
    };
  };
}

export interface UserStreak {
  currentStreak: number;
  longestStreak: number;
  totalActivity: number;
  lastActivity: string;
  isStreakActive: boolean;
  isStreakLost: boolean;
  checkedInToday: boolean;
}

export interface StreakHistory {
  date: string;
  active: boolean;
}
