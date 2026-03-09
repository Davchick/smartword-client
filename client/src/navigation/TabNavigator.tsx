import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BookOpen, Dumbbell, MessageCircle, User } from 'lucide-react-native';
import { useTheme, fonts } from '../theme';
import type { MainTabParamList, GroupsStackParamList, TrainingStackParamList } from './types';

import { GroupsScreen } from '../screens/Groups/GroupsScreen';
import { GroupDetailScreen } from '../screens/Groups/GroupDetailScreen';
import { ArchiveScreen } from '../screens/Groups/ArchiveScreen';
import { TrainingModesScreen } from '../screens/Training/TrainingModesScreen';
import { TrainingScreen } from '../screens/Training/TrainingScreen';
import { WritingTrainingScreen } from '../screens/Training/WritingTrainingScreen';
// TrainingScreen используется внутри GroupsStack
import { ChatScreen } from '../screens/Chat/ChatScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const TrainingStack = createNativeStackNavigator<TrainingStackParamList>();

const GroupsNavigator = () => (
  <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
    <GroupsStack.Screen name="Groups" component={GroupsScreen} />
    <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    <GroupsStack.Screen name="Archive" component={ArchiveScreen} />
    <GroupsStack.Screen name="TrainingModes" component={TrainingModesScreen} />
    <GroupsStack.Screen name="Training" component={TrainingScreen} />
    <GroupsStack.Screen name="TrainingWrite" component={WritingTrainingScreen} />
  </GroupsStack.Navigator>
);

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
        }}
      />
      <Tab.Screen
        name="TrainingTab"
        component={TrainingNavigator}
        options={{
          tabBarLabel: 'Тренировка',
          tabBarIcon: ({ color, size }) => <Dumbbell color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen}
        options={{
          tabBarLabel: 'AI-чат',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Профиль',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};
