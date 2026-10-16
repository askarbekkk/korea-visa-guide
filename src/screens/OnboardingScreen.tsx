// ─── Онбординг ────────────────────────────────────────────────────────────────
// 3 шага: гражданство → статус визы → что нужно (опционально).
// После завершения сохраняет userProfile в AsyncStorage и переходит на дашборд.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { saveProfile } from '../storage/profile';
import {
  Citizenship,
  VisaStatus,
  UserIntent,
  UserProfile,
} from '../types';

const { width } = Dimensions.get('window');

// Пропсы — колбэк который вызывается когда онбординг завершён
interface Props {
  onComplete: () => void;
}

// ── Данные для каждого шага ──────────────────────────────────────────────────

const CITIZENSHIPS: { value: Citizenship; labelKey: string }[] = [
  { value: 'RU', labelKey: 'onboarding.step1.ru' },
  { value: 'KZ', labelKey: 'onboarding.step1.kz' },
  { value: 'UZ', labelKey: 'onboarding.step1.uz' },
  { value: 'KG', labelKey: 'onboarding.step1.kg' },
  { value: 'OTHER', labelKey: 'onboarding.step1.other' },
];

const VISA_STATUSES: { value: VisaStatus; labelKey: string }[] = [
  { value: 'D-2',        labelKey: 'onboarding.step2.d2' },
  { value: 'D-4',        labelKey: 'onboarding.step2.d4' },
  { value: 'D-10',       labelKey: 'onboarding.step2.d10' },
  { value: 'E-7',        labelKey: 'onboarding.step2.e7' },
  { value: 'F-4',        labelKey: 'onboarding.step2.f4' },
  { value: 'F-2',        labelKey: 'onboarding.step2.f2' },
  { value: 'F-5',        labelKey: 'onboarding.step2.f5' },
  { value: 'F-6',        labelKey: 'onboarding.step2.f6' },
  { value: 'G-1',        labelKey: 'onboarding.step2.g1' },
  { value: 'H-2',        labelKey: 'onboarding.step2.h2' },
  { value: 'NOT_ARRIVED', labelKey: 'onboarding.step2.notArrived' },
];

const INTENTS: { value: UserIntent; labelKey: string }[] = [
  { value: 'EXTEND', labelKey: 'onboarding.step3.extend' },
  { value: 'CHANGE_STATUS', labelKey: 'onboarding.step3.changeStatus' },
  { value: 'REGISTER_ARC', labelKey: 'onboarding.step3.registerArc' },
  { value: 'FIND_JOB', labelKey: 'onboarding.step3.findJob' },
];

// ── Компонент ────────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete }: Props) {
  const { t } = useTranslation();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [citizenship, setCitizenship] = useState<Citizenship | null>(null);
  const [visaStatus, setVisaStatus] = useState<VisaStatus | null>(null);
  const [intent, setIntent] = useState<UserIntent | null>(null);

  // Сохраняем профиль и переходим на дашборд
  async function handleFinish(selectedIntent: UserIntent | null) {
    const profile: UserProfile = {
      citizenship: citizenship!,
      visaStatus: visaStatus!,
      intent: selectedIntent ?? undefined,
      language: 'ru', // TODO: определять язык системы через expo-localization
      createdAt: new Date().toISOString(),
    };
    await saveProfile(profile);
    onComplete();
  }

  // ── Шаг 1: Гражданство ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <StepIndicator current={1} total={3} />
        <Text style={styles.title}>{t('onboarding.step1.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.step1.subtitle')}</Text>

        <View style={styles.options}>
          {CITIZENSHIPS.map(({ value, labelKey }) => (
            <OptionButton
              key={value}
              label={t(labelKey)}
              selected={citizenship === value}
              onPress={() => setCitizenship(value)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, !citizenship && styles.nextButtonDisabled]}
          onPress={() => citizenship && setStep(2)}
          disabled={!citizenship}
        >
          <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── Шаг 2: Статус визы ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <StepIndicator current={2} total={3} />
        <Text style={styles.title}>{t('onboarding.step2.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.step2.subtitle')}</Text>

        <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.options}>
            {VISA_STATUSES.map(({ value, labelKey }) => (
              <OptionButton
                key={value}
                label={t(labelKey)}
                selected={visaStatus === value}
                onPress={() => setVisaStatus(value)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(1)}>
            <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextButton, styles.nextButtonFlex, !visaStatus && styles.nextButtonDisabled]}
            onPress={() => visaStatus && setStep(3)}
            disabled={!visaStatus}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Шаг 3: Что нужно (опционально) ───────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StepIndicator current={3} total={3} />
      <Text style={styles.title}>{t('onboarding.step3.title')}</Text>
      <Text style={styles.subtitle}>{t('onboarding.step3.subtitle')}</Text>

      <View style={styles.options}>
        {INTENTS.map(({ value, labelKey }) => (
          <OptionButton
            key={value}
            label={t(labelKey)}
            selected={intent === value}
            onPress={() => setIntent(value)}
          />
        ))}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>{t('onboarding.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => handleFinish(null)}
        >
          <Text style={styles.skipButtonText}>{t('onboarding.step3.skip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, styles.nextButtonFlex]}
          onPress={() => handleFinish(intent)}
        >
          <Text style={styles.nextButtonText}>{t('onboarding.finish')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Переиспользуемые мини-компоненты ─────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepIndicator}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i + 1 === current && styles.stepDotActive,
            i + 1 < current && styles.stepDotDone,
          ]}
        />
      ))}
    </View>
  );
}

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

function OptionButton({ label, selected, onPress }: OptionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </TouchableOpacity>
  );
}

// ── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
    marginTop: 16,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  stepDotActive: {
    backgroundColor: '#1A73E8',
    width: 24, // активная точка шире
  },
  stepDotDone: {
    backgroundColor: '#A8C7FA',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 28,
  },
  optionsScroll: {
    flex: 1,
  },
  options: {
    gap: 12,
    paddingBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#EBF3FF',
    borderColor: '#1A73E8',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#1A73E8',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#1A73E8',
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    marginTop: 16,
  },
  nextButton: {
    backgroundColor: '#1A73E8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  nextButtonFlex: {
    flex: 1,
    marginBottom: 0,
    marginTop: 0,
  },
  nextButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backButtonText: {
    color: '#555',
    fontSize: 16,
  },
  skipButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
