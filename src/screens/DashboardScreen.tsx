import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getProfile, updateProfile } from '../storage/profile';
import { getChecklistProgress } from '../storage/checklist';
import { UserProfile, Checklist } from '../types';

import d2Extension   from '../content/checklists/d2-extension.json';
import d4Extension   from '../content/checklists/d4-extension.json';
import arcReg        from '../content/checklists/arc-registration.json';
import partTimeWork  from '../content/checklists/part-time-work.json';
import d2ToD10       from '../content/checklists/d2-to-d10.json';
import reentry       from '../content/checklists/reentry-permit.json';
import addressChange from '../content/checklists/address-change.json';
import g1App         from '../content/checklists/g1-application.json';
import f4App         from '../content/checklists/f4-application.json';
import e7App         from '../content/checklists/e7-application.json';

interface Props {
  onOpenChecklist: (checklist: Checklist) => void;
  onResetProfile: () => void;
}

// Иконки процедур
const PROCEDURE_ICONS: Record<string, string> = {
  'EXTEND':         '📅',
  'REGISTER_ARC':   '🪪',
  'PART_TIME_WORK': '💼',
  'CHANGE_STATUS':  '🔄',
  'REENTRY_PERMIT': '✈️',
  'ADDRESS_CHANGE': '🏠',
};

function getChecklistsForProfile(p: UserProfile): Checklist[] {
  const cast = (x: unknown) => x as unknown as Checklist;
  const common = [cast(reentry), cast(addressChange)];

  switch (p.visaStatus) {
    case 'NOT_ARRIVED':
      return [cast(arcReg)];
    case 'D-2':
      return [cast(d2Extension), cast(partTimeWork), cast(d2ToD10), ...common];
    case 'D-4':
      return [cast(d4Extension), cast(partTimeWork), ...common];
    case 'D-10':
      return [cast(e7App), ...common];
    case 'E-7':
      return common;
    case 'F-4':
      return [cast(f4App), ...common];
    case 'F-2':
    case 'F-5':
    case 'F-6':
    case 'H-2':
      return common;
    case 'G-1':
      return [cast(g1App), ...common];
    default:
      return common;
  }
}

function getDaysLeft(dateStr: string): number {
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

interface ChecklistEntry {
  checklist: Checklist;
  completed: number;
  total: number;
}

export default function DashboardScreen({ onOpenChecklist, onResetProfile }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ru' | 'en';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<ChecklistEntry[]>([]);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [expiryInput, setExpiryInput] = useState('');

  const loadAll = useCallback(async () => {
    const p = await getProfile();
    if (!p) return;
    setProfile(p);
    const checklists = getChecklistsForProfile(p);
    const loaded = await Promise.all(
      checklists.map(async (cl) => {
        const prog = await getChecklistProgress(cl.id);
        return { checklist: cl, completed: prog.completedDocumentIds.length, total: cl.documents.length };
      })
    );
    setEntries(loaded);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Обновляем прогресс когда возвращаемся с ChecklistScreen
  const refreshProgress = useCallback(async () => {
    if (!profile) return;
    const checklists = getChecklistsForProfile(profile);
    const loaded = await Promise.all(
      checklists.map(async (cl) => {
        const prog = await getChecklistProgress(cl.id);
        return { checklist: cl, completed: prog.completedDocumentIds.length, total: cl.documents.length };
      })
    );
    setEntries(loaded);
  }, [profile]);

  async function saveExpiry() {
    if (!profile) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryInput)) return;
    await updateProfile({ visaExpiryDate: expiryInput });
    setProfile({ ...profile, visaExpiryDate: expiryInput });
    setEditingExpiry(false);
    setExpiryInput('');
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  const daysLeft = profile.visaExpiryDate ? getDaysLeft(profile.visaExpiryDate) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Шапка ── */}
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>{t('dashboard.greeting')}</Text>
          <TouchableOpacity onPress={onResetProfile} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.resetBtn}>⚙ {t('dashboard.changeProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Карточка визы ── */}
        <View style={styles.visaCard}>
          <Text style={styles.cardLabel}>{t('dashboard.visaCard')}</Text>
          <Text style={styles.visaStatus}>{t(`visaStatus.${profile.visaStatus}`)}</Text>
          <Text style={styles.citizenship}>{t(`citizenship.${profile.citizenship}`)}</Text>

          <View style={styles.divider} />

          {profile.visaExpiryDate && daysLeft !== null ? (
            <View>
              <Text style={styles.expiryLabel}>{t('dashboard.expiryLabel')}</Text>
              <Text style={styles.expiryDate}>{profile.visaExpiryDate}</Text>
              <Text style={[
                styles.daysLeft,
                daysLeft > 30 ? styles.colorGreen :
                daysLeft > 0  ? styles.colorOrange : styles.colorRed,
              ]}>
                {daysLeft > 0 ? `${daysLeft} ${t('dashboard.daysLeft')}` : t('dashboard.expired')}
              </Text>
              {!editingExpiry && (
                <TouchableOpacity onPress={() => { setExpiryInput(profile.visaExpiryDate!); setEditingExpiry(true); }}>
                  <Text style={styles.linkText}>{t('dashboard.changeDate')}</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : !editingExpiry ? (
            <TouchableOpacity onPress={() => setEditingExpiry(true)}>
              <Text style={styles.linkText}>{t('dashboard.addExpiry')}</Text>
            </TouchableOpacity>
          ) : null}

          {editingExpiry && (
            <View style={styles.expiryForm}>
              <TextInput
                style={styles.dateInput}
                value={expiryInput}
                onChangeText={setExpiryInput}
                placeholder={t('dashboard.datePlaceholder')}
                placeholderTextColor="#AAAAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                autoFocus
              />
              <View style={styles.formButtons}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveExpiry}>
                  <Text style={styles.saveBtnText}>{t('dashboard.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingExpiry(false)}>
                  <Text style={styles.cancelBtnText}>{t('dashboard.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Список процедур ── */}
        <Text style={styles.sectionTitle}>{t('dashboard.procedures')}</Text>

        {entries.map(({ checklist, completed, total }) => {
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const icon = PROCEDURE_ICONS[checklist.procedure] ?? '📋';
          return (
            <TouchableOpacity
              key={checklist.id}
              style={styles.procedureCard}
              onPress={() => onOpenChecklist(checklist)}
              activeOpacity={0.75}
            >
              <View style={styles.procedureLeft}>
                <Text style={styles.procedureIcon}>{icon}</Text>
                <View style={styles.procedureInfo}>
                  <Text style={styles.procedureTitle}>{checklist.title[lang]}</Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{completed}/{total} · {pct}%</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  container: { padding: 20, paddingBottom: 40, gap: 12 },

  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { fontSize: 26, fontWeight: '700', color: '#1A1A1A' },
  resetBtn: { fontSize: 12, color: '#AAAAAA' },

  // Виза
  visaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: '600' },
  visaStatus: { fontSize: 22, fontWeight: '700', color: '#1A73E8', marginBottom: 4 },
  citizenship: { fontSize: 16, color: '#555' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 14 },
  expiryLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  expiryDate: { fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  daysLeft: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  colorGreen:  { color: '#34A853' },
  colorOrange: { color: '#F9A825' },
  colorRed:    { color: '#E53935' },
  linkText: { fontSize: 14, color: '#1A73E8', fontWeight: '500' },
  expiryForm: { gap: 10, marginTop: 8 },
  dateInput: {
    backgroundColor: '#F5F7FA', borderRadius: 10, padding: 13,
    fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#DDEAFF',
  },
  formButtons: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: '#1A73E8', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  cancelBtn: { flex: 1, backgroundColor: '#F0F0F0', borderRadius: 10, padding: 13, alignItems: 'center' },
  cancelBtnText: { color: '#555', fontSize: 15 },

  // Процедуры
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  procedureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  procedureLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  procedureIcon: { fontSize: 28 },
  procedureInfo: { flex: 1, gap: 6 },
  procedureTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  progressBarBg: { height: 5, backgroundColor: '#E8EFF8', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: 5, backgroundColor: '#1A73E8', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#888' },
  chevron: { fontSize: 22, color: '#CCCCCC', marginLeft: 8 },
});
