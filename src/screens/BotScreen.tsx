// ─── Экран бота ───────────────────────────────────────────────────────────────
// Поток: вопрос → Tavily ищет по hikorea.go.kr → результаты → DeepSeek отвечает
// Если Tavily недоступен — DeepSeek отвечает из своих знаний (резервный режим).

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { runAgent } from '../agent/agent';
import { getProfile } from '../storage/profile';
import { UserProfile } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Источники из Tavily — показываем под сообщением бота
  sources?: Array<{ title: string; url: string }>;
}

// Статус поиска — показываем пользователю что происходит
type SearchStatus = 'idle' | 'searching' | 'generating';

const HINT_KEYS = ['bot.hint1', 'bot.hint2', 'bot.hint3', 'bot.hint4'] as const;

export default function BotScreen() {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('idle');
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || searchStatus !== 'idle') return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    const language = i18n.language as 'ru' | 'en';

    try {
      // The agent picks its own tools: app guides, official-site search, deadline calculator, exchange rates.
      setSearchStatus('generating');
      const { answer, sources } = await runAgent(trimmed, {
        profile,
        language,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer || t('bot.noAnswer'),
        sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      // Логируем реальную ошибку чтобы видеть что именно упало
      console.error('[Bot] Error:', error);
      const errorText = error instanceof Error ? error.message : String(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `${t('bot.noAnswer')}\n\n[Debug: ${errorText}]`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSearchStatus('idle');
    }
  }

  const isLoading = searchStatus !== 'idle';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('bot.title')}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.hints}>
              {HINT_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.hintButton}
                  onPress={() => sendMessage(t(key))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.hintText}>{t(key)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && <LoadingIndicator status={searchStatus} t={t} />}
        </ScrollView>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('bot.disclaimer')}</Text>
          <View style={styles.disclaimerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.hikorea.go.kr')}>
              <Text style={styles.link}>{t('bot.openHikorea')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Linking.openURL('tel:1345')}>
              <Text style={styles.link}>{t('bot.callCenter')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('bot.placeholder')}
            placeholderTextColor="#AAAAAA"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Пузырь сообщения ──────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View style={styles.bubbleWrapper}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
          {message.content}
        </Text>
      </View>

      {/* Источники под сообщением бота */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <View style={styles.sources}>
          {message.sources.map((src, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => Linking.openURL(src.url)}
            >
              <Text style={styles.sourceLink} numberOfLines={1}>
                🔗 {src.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Индикатор загрузки с подсказкой что происходит ───────────────────────────

function LoadingIndicator({ status, t }: { status: SearchStatus; t: (key: string) => string }) {
  const label = status === 'searching' ? t('bot.searching') : t('bot.sending');

  return (
    <View style={styles.loadingBubble}>
      <ActivityIndicator size="small" color="#1A73E8" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  hints: {
    gap: 10,
    marginBottom: 8,
  },
  hintButton: {
    backgroundColor: '#F0F6FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#D0E4FF',
  },
  hintText: {
    fontSize: 14,
    color: '#1A73E8',
  },
  bubbleWrapper: {
    gap: 4,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: '#1A73E8',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#F5F7FA',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFFFFF',
  },
  bubbleTextBot: {
    color: '#1A1A1A',
  },
  sources: {
    alignSelf: 'flex-start',
    gap: 2,
    paddingLeft: 4,
  },
  sourceLink: {
    fontSize: 12,
    color: '#1A73E8',
    textDecorationLine: 'underline',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 12,
    borderBottomLeftRadius: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  disclaimer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 6,
  },
  disclaimerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  link: {
    fontSize: 12,
    color: '#1A73E8',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1A1A1A',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A73E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#B0C4DE',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
});
