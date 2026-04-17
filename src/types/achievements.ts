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
