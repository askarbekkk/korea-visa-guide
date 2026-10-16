import React, { useState } from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';

import DashboardScreen from '../screens/DashboardScreen';
import ChecklistScreen from '../screens/ChecklistScreen';
import BotScreen from '../screens/BotScreen';
import LockedTab from '../components/LockedTab';
import { Checklist } from '../types';

const Tab = createBottomTabNavigator();

function TabIcon({ label, locked }: { label: string; locked?: boolean }) {
  const icons: Record<string, string> = {
    guide: '📋',
    bot: '💬',
    korean: '🇰🇷',
    transfers: '💱',
  };
  return (
    <Text style={{ fontSize: 20 }}>
      {icons[label]}{locked ? '🔒' : ''}
    </Text>
  );
}

interface TabNavigatorProps {
  onResetProfile: () => void;
}

function GuideTab({ onResetProfile }: { onResetProfile: () => void }) {
  const [openChecklist, setOpenChecklist] = useState<Checklist | null>(null);

  if (openChecklist) {
    return (
      <ChecklistScreen
        checklist={openChecklist}
        onBack={() => setOpenChecklist(null)}
      />
    );
  }

  return (
    <DashboardScreen
      onOpenChecklist={setOpenChecklist}
      onResetProfile={onResetProfile}
    />
  );
}

export default function TabNavigator({ onResetProfile }: TabNavigatorProps) {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#1A73E8',
        tabBarInactiveTintColor: '#AAAAAA',
      }}
    >
      <Tab.Screen
        name="Guide"
        options={{
          tabBarLabel: t('tabs.guide'),
          tabBarIcon: () => <TabIcon label="guide" />,
        }}
      >
        {() => <GuideTab onResetProfile={onResetProfile} />}
      </Tab.Screen>
      <Tab.Screen
        name="Bot"
        component={BotScreen}
        options={{
          tabBarLabel: t('tabs.bot'),
          tabBarIcon: () => <TabIcon label="bot" />,
        }}
      />
      <Tab.Screen
        name="Korean"
        options={{
          tabBarLabel: t('tabs.korean'),
          tabBarIcon: () => <TabIcon label="korean" locked />,
          tabBarLabelStyle: { color: '#CCCCCC' },
        }}
      >
        {() => <LockedTab tabName="korean" />}
      </Tab.Screen>
      <Tab.Screen
        name="Transfers"
        options={{
          tabBarLabel: t('tabs.transfers'),
          tabBarIcon: () => <TabIcon label="transfers" locked />,
          tabBarLabelStyle: { color: '#CCCCCC' },
        }}
      >
        {() => <LockedTab tabName="transfers" />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
