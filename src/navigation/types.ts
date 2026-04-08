import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// --- Root Stack ---
export type RootStackParamList = {
  Welcome: undefined;
  SignIn: { fromProfile?: boolean } | undefined;
  Main: undefined;
  ProfileSettings: undefined;
  BillingPayment: undefined;
  Achievements: undefined;
  Legal: undefined;
};

// --- Main Tab ---
export type MainTabParamList = {
  GroupsTab: undefined;
  TrainingTab: {
    groupId?: string;
    groupName?: string;
  } | undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

// --- Groups Stack (внутри таба Словари) ---
export type GroupsStackParamList = {
  Groups: undefined;
  GroupDetail: {
    groupId: string;
    groupName: string;
    language: string;
  };
  Archive: undefined;
};

// --- Training Stack (внутри таба Тренировка) ---
export type TrainingStackParamList = {
  TrainingModes: {
    groupId?: string;
    groupName?: string;
  };
  Training: {
    groupId?: string;
    groupName?: string;
  };
  TrainingWrite: {
    groupId?: string;
    groupName?: string;
  };
};

// --- Типизация props экранов ---
export type GroupsScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'Groups'>,
  BottomTabScreenProps<MainTabParamList>
>;

export type GroupDetailScreenProps = CompositeScreenProps<
  NativeStackScreenProps<GroupsStackParamList, 'GroupDetail'>,
  BottomTabScreenProps<MainTabParamList>
>;

export type TrainingScreenProps = NativeStackScreenProps<
  TrainingStackParamList,
  'Training'
>;

export type TrainingModesScreenProps = NativeStackScreenProps<
  TrainingStackParamList,
  'TrainingModes'
>;

export type TrainingWriteScreenProps = NativeStackScreenProps<
  TrainingStackParamList,
  'TrainingWrite'
>;
