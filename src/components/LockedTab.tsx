// ─── Заглушка для заблокированных вкладок (Корейский, Переводы) ──────────────
// Показывает замок + сообщение "скоро". Логирует тап — это бесплатный замер интереса.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Props {
  tabName: string; // название вкладки для логирования аналитики
}

export default function LockedTab({ tabName }: Props) {
  const { t } = useTranslation();

  // TODO: заменить console.log на реальную аналитику (Amplitude / Firebase) в Релизе 2
  React.useEffect(() => {
    console.log(`[analytics] locked_tab_tapped: ${tabName}`);
  }, [tabName]);

  return (
    <View style={styles.container}>
      <Text style={styles.lock}>🔒</Text>
      <Text style={styles.title}>{t('locked.title')}</Text>
      <Text style={styles.message}>{t('locked.message')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 24,
  },
  lock: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
