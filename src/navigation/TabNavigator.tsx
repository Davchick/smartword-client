import React from 'react';
import { Platform, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookOpen, Dumbbell, MessageCircle, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, fonts } from '../theme';
import type { MainTabParamList, GroupsStackParamList, TrainingStackParamList } from './types';

import { GroupsScreen } from '../screens/Groups/GroupsScreen';
import { GroupDetailScreen } from '../screens/Groups/GroupDetailScreen';
import { ArchiveScreen } from '../screens/Groups/ArchiveScreen';
import { TrainingModesScreen } from '../screens/Training/TrainingModesScreen';
import { TrainingScreen } from '../screens/Training/TrainingScreen';
import { WritingTrainingScreen } from '../screens/Training/WritingTrainingScreen';
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const TrainingStack = createNativeStackNavigator<TrainingStackParamList>();

// Haptic-обёртка для таб-кнопок
const HapticTab: React.FC<any> = (props) => {
  const { onPress, ...rest } = props;
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          try {
            Haptics.selectionAsync().catch(() => {
              // Игнорируем ошибки haptics — не критично
            });
          } catch {
            // Haptics модуль может быть недоступен — игнорируем
          }
        }
        onPress?.(e);
      }}
    />
  );
};

// GroupsStack — только словари и архив. Тренировки — через TrainingTab.
const GroupsNavigator = () => (
  <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
    <GroupsStack.Screen name="Groups" component={GroupsScreen} />
    <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    <GroupsStack.Screen name="Archive" component={ArchiveScreen} />
  </GroupsStack.Navigator>
);

// TrainingStack — единственный источник training-экранов
const TrainingNavigator = () => (
  <TrainingStack.Navigator screenOptions={{ headerShown: false }}>
    <TrainingStack.Screen name="TrainingModes" component={TrainingModesScreen} />
    <TrainingStack.Screen name="Training" component={TrainingScreen} />
    <TrainingStack.Screen name="TrainingWrite" component={WritingTrainingScreen} />
  </TrainingStack.Navigator>
);

export const TabNavigator = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 76,
          paddingBottom: 14,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.medium,
        },
      }}
    >
      <Tab.Screen
        name="GroupsTab"
        component={GroupsNavigator}
        options={{
          tabBarLabel: 'Словари',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          tabBarButton: HapticTab as any,
        }}
      />
      <Tab.Screen
        name="TrainingTab"
        component={TrainingNavigator}
        options={{
          tabBarLabel: 'Тренировка',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
          tabBarButton: HapticTab as any,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI-чат',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          tabBarButton: HapticTab as any,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          tabBarButton: HapticTab as any,
        }}
      />
    </Tab.Navigator>
  );
};
