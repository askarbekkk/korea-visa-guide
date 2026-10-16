import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getChecklistProgress, toggleDocumentComplete } from '../storage/checklist';
import { getCachedLiveData, setCachedLiveData, daysAgo } from '../storage/hikoreaCache';
import { fetchLiveChecklistData, LiveChecklistData } from '../services/HiKoreaService';
import { Checklist, ChecklistDocument, ChecklistProgress } from '../types';
import DocumentDetailModal from '../components/DocumentDetailModal';

interface Props {
  checklist: Checklist;
  onBack: () => void;
}

type LiveStatus = 'idle' | 'loading' | 'loaded' | 'error';

export default function ChecklistScreen({ checklist, onBack }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'ru' | 'en';

  const [progress, setProgress] = useState<ChecklistProgress | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<ChecklistDocument | null>(null);
  const [liveData, setLiveData] = useState<LiveChecklistData | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');
  const [liveError, setLiveError] = useState<string>('');

  // Загрузка прогресса
  useEffect(() => {
    getChecklistProgress(checklist.id).then(setProgress);
  }, [checklist.id]);

  // При открытии — только кэш, без авто-запроса к API
  useEffect(() => {
    getCachedLiveData(checklist.id).then((cached) => {
      if (cached) {
        setLiveData(cached);
        setLiveStatus('loaded');
      } else {
        setLiveStatus('idle');
      }
    });
  }, [checklist.id]);

  const syncWithHiKorea = useCallback(async () => {
    setLiveStatus('loading');
    setLiveError('');
    try {
      const fresh = await fetchLiveChecklistData(checklist.id);
      setLiveData(fresh);
      setLiveStatus('loaded');
      setCachedLiveData(checklist.id, fresh);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[HiKorea]', msg);
      setLiveError(msg);
      setLiveStatus('error');
    }
  }, [checklist.id]);

  const toggle = useCallback(
    async (docId: string) => {
      const updated = await toggleDocumentComplete(checklist.id, docId);
      setProgress(updated);
    },
    [checklist.id]
  );

  // Живые документы с fallback на статику
  // Сохраняем detail из статического JSON если id совпадает
  const documents: ChecklistDocument[] = liveData
    ? liveData.documents.map((liveDoc) => {
        const staticDoc = checklist.documents.find(
          (d) => d.id === liveDoc.id || liveDoc.id.includes(d.id) || d.id.includes(liveDoc.id)
        );
        return { ...liveDoc, detail: staticDoc?.detail };
      })
    : checklist.documents;

  const when = liveData?.when ?? checklist.when;
  const fee = liveData?.fee ?? checklist.fee;

  if (!progress) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1A73E8" />
      </View>
    );
  }

  const completed = progress.completedDocumentIds.length;
  const total = documents.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{checklist.title[lang]}</Text>
      </View>

      {/* HiKorea badge */}
      <LiveBadge status={liveStatus} liveData={liveData} error={liveError} onSync={syncWithHiKorea} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{t('checklist.documentsLabel')}</Text>
            <Text style={styles.progressCount}>{completed}/{total} · {pct}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Document list */}
        {documents.map((doc) => {
          const done = progress.completedDocumentIds.includes(doc.id);
          const hasDetail = !!doc.detail;
          return (
            <View key={doc.id} style={[styles.docItem, done && styles.docItemDone]}>
              <TouchableOpacity
                style={styles.docCheckRow}
                onPress={() => toggle(doc.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, done && styles.checkboxDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.docLabel, done && styles.docLabelDone]}>
                  {doc.label[lang]}
                </Text>
              </TouchableOpacity>
              {hasDetail && (
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={() => setSelectedDoc(doc)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.infoBtnText}>ℹ</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Когда подавать */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>{t('checklist.when')}</Text>
          <Text style={styles.infoCardValue}>{when[lang]}</Text>
        </View>

        {/* Стоимость */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>{t('checklist.fee')}</Text>
          <Text style={styles.infoCardValue}>{fee[lang]}</Text>
        </View>

        {/* HiKorea button */}
        <TouchableOpacity
          style={styles.hikoreaBtn}
          onPress={() => Linking.openURL(liveData?.sourceUrl ?? checklist.whereUrl)}
          activeOpacity={0.85}
        >
          <Text style={styles.hikoreaBtnText}>{t('checklist.openHikorea')} ↗</Text>
        </TouchableOpacity>

        <Text style={styles.sourceText}>
          {t('checklist.source')}: {checklist.source} · {checklist.lastUpdated}
        </Text>
      </ScrollView>

      <DocumentDetailModal
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
      />
    </SafeAreaView>
  );
}

// ── Badge компонент ─────────────────────────────────────────────────────────

function LiveBadge({ status, liveData, error, onSync }: {
  status: LiveStatus;
  liveData: LiveChecklistData | null;
  error: string;
  onSync: () => void;
}) {
  if (status === 'loading') {
    return (
      <View style={badge.row}>
        <ActivityIndicator size="small" color="#1A73E8" />
        <Text style={badge.loadingText}>Получаю данные с HiKorea...</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[badge.row, badge.rowError]}>
        <Text style={badge.errorText} numberOfLines={1}>⚠ {error || 'Ошибка HiKorea'}</Text>
        <TouchableOpacity onPress={onSync} style={badge.retryBtn}>
          <Text style={badge.retryText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (status === 'loaded' && liveData) {
    const days = daysAgo(liveData.fetchedAt);
    const label = days === 0 ? 'сегодня' : `${days} дн. назад`;
    return (
      <View style={[badge.row, badge.rowLive]}>
        <Text style={badge.liveText}>🌐 HiKorea · обновлено {label}</Text>
        <TouchableOpacity onPress={onSync} style={badge.retryBtn}>
          <Text style={[badge.retryText, { color: '#2E7D32' }]}>↻</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // idle — кэша нет, предлагаем синхронизацию
  return (
    <TouchableOpacity style={[badge.row, badge.rowIdle]} onPress={onSync} activeOpacity={0.7}>
      <Text style={badge.idleText}>🌐 Получить актуальные данные с HiKorea</Text>
    </TouchableOpacity>
  );
}

const badge = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: '#F0F6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDEAFF',
  },
  rowLive:  { backgroundColor: '#E8F5E9', borderBottomColor: '#C8E6C9' },
  rowError: { backgroundColor: '#FFF8E1', borderBottomColor: '#FFE082' },
  rowIdle:  { backgroundColor: '#F5F5F5', borderBottomColor: '#E0E0E0' },
  loadingText: { flex: 1, fontSize: 12, color: '#1A73E8', fontWeight: '500' },
  liveText:    { flex: 1, fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  errorText:   { flex: 1, fontSize: 12, color: '#795548', fontWeight: '500' },
  idleText:    { flex: 1, fontSize: 12, color: '#888', fontWeight: '500' },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 6 },
  retryText: { fontSize: 12, color: '#555', fontWeight: '600' },
});

// ── Основные стили ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: { marginRight: 12 },
  backArrow: { fontSize: 24, color: '#1A73E8', lineHeight: 28 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  progressCard: { backgroundColor: '#F5F7FA', borderRadius: 14, padding: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel: { fontSize: 14, color: '#555', fontWeight: '500' },
  progressCount: { fontSize: 14, fontWeight: '700', color: '#1A73E8' },
  progressBarBg: { height: 8, backgroundColor: '#DDEAFF', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: 8, backgroundColor: '#1A73E8', borderRadius: 4 },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    paddingRight: 10,
  },
  docItemDone: { backgroundColor: '#F0F7FF', borderColor: '#B8D8FF' },
  docCheckRow: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  checkbox: {
    width: 26, height: 26, borderRadius: 7,
    borderWidth: 2, borderColor: '#CCCCCC',
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  checkboxDone: { backgroundColor: '#1A73E8', borderColor: '#1A73E8' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  docLabel: { flex: 1, fontSize: 15, color: '#222', lineHeight: 21 },
  docLabelDone: { color: '#999', textDecorationLine: 'line-through' },
  infoBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 4, flexShrink: 0,
  },
  infoBtnText: { fontSize: 15, color: '#1A73E8', fontWeight: '700' },
  infoCard: { backgroundColor: '#F5F7FA', borderRadius: 12, padding: 16 },
  infoCardLabel: {
    fontSize: 11, color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 6, fontWeight: '600',
  },
  infoCardValue: { fontSize: 15, color: '#333', lineHeight: 22 },
  hikoreaBtn: { backgroundColor: '#1A73E8', borderRadius: 14, padding: 16, alignItems: 'center' },
  hikoreaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  sourceText: { fontSize: 11, color: '#BBBBBB', textAlign: 'center', marginTop: 4 },
});
