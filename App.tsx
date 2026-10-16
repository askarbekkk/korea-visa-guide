// ─── Точка входа в приложение ─────────────────────────────────────────────────
// Логика первого запуска:
//   - профиль есть → сразу дашборд (tab navigator)
//   - профиля нет  → онбординг
// i18n инициализируется один раз здесь, до рендера экранов.

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Инициализируем i18n при импорте (побочный эффект)
import './src/i18n';

import { getProfile } from './src/storage/profile';
import { UserProfile } from './src/types';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { clearProfile } from './src/storage/profile';

type AppState = 'loading' | 'onboarding' | 'main';

export default function App() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    // Проверяем есть ли уже сохранённый профиль
    getProfile().then((profile: UserProfile | null) => {
      setAppState(profile ? 'main' : 'onboarding');
    });
  }, []);

  // Пока читаем AsyncStorage — показываем спиннер (обычно <100ms)
  if (appState === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  // После онбординга сразу переключаемся на main без перезагрузки
  if (appState === 'onboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={() => setAppState('main')} />
      </SafeAreaProvider>
    );
  }

  async function handleResetProfile() {
    await clearProfile();
    setAppState('onboarding');
  }

  // Основное приложение с tab bar
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <TabNavigator onResetProfile={handleResetProfile} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
