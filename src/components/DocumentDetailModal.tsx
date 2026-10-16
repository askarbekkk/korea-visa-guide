import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { ChecklistDocument } from '../types';

interface Props {
  document: ChecklistDocument | null;
  onClose: () => void;
}

// Статус открыто/закрыто по корейскому времени
function getOpenStatus(hoursType: string): { open: boolean; label: string } {
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const day = now.getDay(); // 0=Sun, 6=Sat
    const t = now.getHours() * 60 + now.getMinutes();
    const isWeekday = day >= 1 && day <= 5;

    if (hoursType === 'immigration') {
      if (!isWeekday) return { open: false, label: 'Сб/Вс — закрыто' };
      if (t < 540 || t >= 1080) return { open: false, label: '09:00–18:00' };
      if (t >= 720 && t < 780) return { open: false, label: 'Перерыв 12:00–13:00' };
      return { open: true, label: '09:00–18:00' };
    }
    if (hoursType === 'bank') {
      if (!isWeekday) return { open: false, label: 'Сб/Вс — закрыто' };
      if (t < 540 || t >= 960) return { open: false, label: '09:00–16:00' };
      return { open: true, label: '09:00–16:00' };
    }
    if (hoursType === 'photo') {
      if (t < 600 || t >= 1260) return { open: false, label: '10:00–21:00' };
      return { open: true, label: '10:00–21:00' };
    }
    if (hoursType === 'school') {
      if (!isWeekday) return { open: false, label: 'Сб/Вс — закрыто' };
      if (t < 540 || t >= 1080) return { open: false, label: '09:00–18:00' };
      if (t >= 720 && t < 780) return { open: false, label: 'Перерыв 12:00–13:00' };
      return { open: true, label: '09:00–18:00' };
    }
  } catch {
    // ignore timezone errors on some platforms
  }
  return { open: true, label: '' };
}

async function getUserCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: loc.coords.latitude, lng: loc.coords.longitude };
  } catch {
    return null;
  }
}

async function openGoogleMaps(query: string) {
  const encoded = encodeURIComponent(query);
  const coords = await getUserCoords();
  if (coords) {
    Linking.openURL(`https://www.google.com/maps/search/${encoded}/@${coords.lat},${coords.lng},14z`);
  } else {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  }
}

async function openNaverMaps(query: string) {
  const encoded = encodeURIComponent(query);
  const appUrl = `nmap://search?query=${encoded}&appname=com.inkor`;
  Linking.canOpenURL(appUrl).then(ok => {
    Linking.openURL(ok ? appUrl : `https://map.naver.com/v5/search/${encoded}`);
  });
}

export default function DocumentDetailModal({ document, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ru' | 'en';

  if (!document?.detail) return null;
  const d = document.detail;

  const openStatus = d.hoursType ? getOpenStatus(d.hoursType) : null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{document.label[lang]}</Text>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

            {/* Как получить */}
            <Section label={`📋  ${t('detail.how')}`}>
              <Text style={styles.bodyText}>{d.how[lang]}</Text>
            </Section>

            {/* Где получить */}
            <Section label={`📍  ${t('detail.where')}`}>
              <Text style={styles.bodyText}>{d.where[lang]}</Text>
            </Section>

            {/* Часы работы */}
            {d.hours && (
              <Section label={`🕐  ${t('detail.hours')}`}>
                {openStatus && (
                  <View style={[styles.badge, openStatus.open ? styles.badgeOpen : styles.badgeClosed]}>
                    <Text style={[styles.badgeText, openStatus.open ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                      {openStatus.open ? `● ${t('detail.open')}` : `● ${t('detail.closed')}`}
                      {openStatus.label ? `  ·  ${openStatus.label}` : ''}
                    </Text>
                  </View>
                )}
                <Text style={styles.bodyText}>{d.hours[lang]}</Text>
              </Section>
            )}

            {/* Что сказать по-корейски */}
            {d.koreanPhrase && (
              <Section label={`💬  ${t('detail.phrase')}`}>
                <View style={styles.phraseBox}>
                  <Text style={styles.phraseText}>{d.koreanPhrase[lang]}</Text>
                </View>
              </Section>
            )}

            {/* Совет */}
            {d.tip && (
              <Section label={`💡  ${t('detail.tip')}`}>
                <Text style={styles.bodyText}>{d.tip[lang]}</Text>
              </Section>
            )}

            {/* Онлайн */}
            {d.onlineUrl && (
              <TouchableOpacity style={styles.onlineBtn} onPress={() => Linking.openURL(d.onlineUrl!)}>
                <Text style={styles.onlineBtnText}>🌐  {t('detail.openOnline')}</Text>
              </TouchableOpacity>
            )}

            {/* Кнопки карт */}
            {d.mapQuery && (
              <View style={styles.mapsRow}>
                <TouchableOpacity style={styles.mapBtnGoogle} onPress={() => { openGoogleMaps(d.mapQuery!); }}>
                  <Text style={styles.mapBtnText}>📍 {t('detail.googleMaps')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mapBtnNaver} onPress={() => { openNaverMaps(d.mapQuery!); }}>
                  <Text style={styles.mapBtnText}>📍 {t('detail.naverMaps')}</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 34,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DEDEDE',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 18,
    lineHeight: 24,
  },
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bodyText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 23,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 6,
  },
  badgeOpen: { backgroundColor: '#E8F5E9' },
  badgeClosed: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextOpen: { color: '#2E7D32' },
  badgeTextClosed: { color: '#C62828' },
  phraseBox: {
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#1A73E8',
  },
  phraseText: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 23,
  },
  onlineBtn: {
    backgroundColor: '#E8F3FF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  onlineBtnText: { color: '#1A73E8', fontWeight: '600', fontSize: 15 },
  mapsRow: { flexDirection: 'row', gap: 10 },
  mapBtnGoogle: {
    flex: 1,
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  mapBtnNaver: {
    flex: 1,
    backgroundColor: '#03C75A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  mapBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  closeBtn: {
    marginTop: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  closeBtnText: { color: '#555', fontWeight: '600', fontSize: 15 },
});
