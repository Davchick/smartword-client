import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send, Bot, Sparkles, MessageCircle, BookOpen,
  RefreshCw, AlertCircle, LogIn, ChevronRight,
  Languages, Copy, Lightbulb, RotateCcw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiPostWithRetry, getBaseUrl } from '../../lib/api';
import { useChat } from '../../hooks/useChat';
import { useProfile } from '../../hooks/useProfile';
import { useGroups } from '../../hooks/useGroups';
import { queryClient } from '../../lib/queryClient';
import { queryKey, invalidateProfile } from '../../lib/queryKeys';
import { TypingIndicator } from '../../components/TypingIndicator';
import { useTheme, fonts } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import type { ChatMessage } from '../../hooks/useChat';
import type { WordGroup } from '../../hooks/useGroups';
import { useDeviceSize } from '../../hooks/useDeviceSize';
import { useResponsiveTypography } from '../../hooks/useResponsiveTypography';
import { moderateScale, scale, verticalScale } from '../../utils/responsive';

// Возвращает true если текст содержит не-русские слова (иностранный язык)
const isForeignText = (text: string): boolean => {
  // Убираем скобки с коррекцией (→ ...) и пунктуацию
  const cleaned = text.replace(/\(→[^)]*\)/g, '').trim();
  // Считаем не-кириллические буквенные символы
  const foreignChars = (cleaned.match(/[a-zA-ZÀ-ÿ\u4e00-\u9fff\u3040-\u30ff\u0600-\u06ff\u00C0-\u024F]/g) || []).length;
  const totalChars = (cleaned.match(/\p{L}/gu) || []).length;
  if (totalChars === 0) return false;
  return foreignChars / totalChars > 0.4;
};

const FREE_MESSAGES_LIMIT = 10;

type ChatStage =
  | 'welcome'    // начальный экран
  | 'choosing'   // выбор словаря — локально, без запроса к ИИ
  | 'active';    // чат идёт

const playNotificationSound = () => {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).AudioContext) {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      // Fallback: закрываем контекст через 500мс, если onended не сработал
      const cleanupTimer = setTimeout(() => ctx.close(), 500);
      osc.onended = () => {
        clearTimeout(cleanupTimer);
        ctx.close();
      };
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch (err) {
    console.warn('[playNotificationSound] error:', err);
  }
};

export const ChatScreen = () => {
  const deviceSize = useDeviceSize();
  const t = useResponsiveTypography();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { groups } = useGroups();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { spacing, radii, isSmall } = deviceSize;

  const [stage, setStage] = useState<ChatStage>('welcome');
  // selectedGroup/freeMode фиксируются в момент выбора и не меняются до сброса
  const [selectedGroup, setSelectedGroup] = useState<WordGroup | null>(null);
  const [freeMode, setFreeMode] = useState(false);

  const {
    messages,
    loading,
    messagesUsed,
    limitReached,
    sendMessage,
    retryMessage,
    setGroup,
    setDesiredContext,
    clearMessages,
    clearConversation,
  } = useChat(
    profile?.ai_messages_used,
    profile?.last_ai_message_reset_at
  );

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isGuestMode = profile === null;

  // Звук при каждом новом сообщении ИИ
  const prevLen = useRef(0);
  useEffect(() => {
    if (messages.length > prevLen.current) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant') playNotificationSound();
    }
    prevLen.current = messages.length;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  // Кнопка "Начать практику" — только проверяем авторизацию и переходим к выбору (без запроса к ИИ)
  const handleStartPractice = useCallback(async () => {
    if (!profile) {
      navigation.navigate('SignIn');
      return;
    }
    try {
      getBaseUrl(); // может бросить Error в production без HTTPS
    } catch {
      navigation.navigate('SignIn');
      return;
    }
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStage('choosing');
    });
  }, [fadeAnim, navigation]);

  // Пользователь выбрал конкретный словарь
  const handleChooseDictionary = useCallback(async (group: WordGroup) => {
    setDesiredContext({ type: 'group', id: group.id, name: group.name });
    clearConversation();
    setSelectedGroup(group);
    setFreeMode(false);
    setGroup(group.id, group.name); // устанавливаем группу в ref ДО отправки
    setStage('active');
    await sendMessage(`Начинаем практику со словарём "${group.name}"`, true);
    scrollToBottom();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [clearConversation, sendMessage, setDesiredContext, setGroup, scrollToBottom]);

  // Пользователь выбрал свободное общение
  const handleFreeChat = useCallback(async () => {
    setDesiredContext({ type: 'free' });
    clearConversation();
    setFreeMode(true);
    setSelectedGroup(null);
    setGroup(undefined, undefined);
    setStage('active');
    await sendMessage('Свободное общение', true);
    scrollToBottom();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [clearConversation, sendMessage, setDesiredContext, setGroup, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || loading) return;
    if (!profile?.is_premium && messagesUsed >= FREE_MESSAGES_LIMIT) {
      return;
    }
    if (limitReached) {
    }
    const text = inputText;
    setInputText('');
    const success = await sendMessage(text);
    if (success) {
      scrollToBottom();
      invalidateProfile(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKey.profile.all });
    }
  }, [inputText, loading, profile, messagesUsed, limitReached, sendMessage, scrollToBottom]);

  const handleReset = useCallback(() => {
    setDesiredContext(undefined);
    clearMessages(); // clearMessages уже сбрасывает groupIdRef внутри
    setStage('choosing');
    setSelectedGroup(null);
    setFreeMode(false);
    setInputText('');
  }, [clearMessages, setDesiredContext]);

  const handleInsertFromHint = useCallback((text: string) => {
    if (!text) return;
    setInputText(text);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const styles = useChatStyles();

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <MessageBubble
        item={item}
        isUser={isUser}
        colors={colors}
        onInsertHint={handleInsertFromHint}
        onRetry={retryMessage}
      />
    );
  }, [colors, handleInsertFromHint, retryMessage]);

  // ── Экран выбора (choosing) ──────────────────────────────────────────────
  const renderChoosingScreen = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.choosingScroll, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Приветствие Лекси */}
      <View style={styles.choosingGreeting}>
        <View style={[styles.choosingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.choosingBubbleText, { color: colors.text }]}>
            {groups.length > 0
              ? `Привет! 👋 Я Лекси, твой AI-партнёр для языковой практики.\n\nВыбери словарь — и я начну вплетать твои слова в разговор. Или выбери свободное общение, и мы сами решим, на каком языке практиковаться.`
              : `Привет! 👋 Я Лекси.\n\nПохоже, у тебя пока нет словарей. Ты можешь начать свободное общение или сначала добавить слова в раздел «Словари».`
            }
          </Text>
        </View>
      </View>

      {/* Словари */}
      {groups.length > 0 && (
        <View style={styles.choosingSection}>
          <Text style={[styles.choosingSectionLabel, { color: colors.muted }]}>
            СЛОВАРИ
          </Text>
          <View style={styles.choosingCards}>
            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                style={[styles.dictCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleChooseDictionary(g)}
                activeOpacity={0.7}
              >
                <View style={[styles.dictCardIcon, { backgroundColor: colors.primaryDim }]}>
                  <BookOpen color={colors.primary} size={moderateScale(18)} />
                </View>
                <View style={styles.dictCardBody}>
                  <Text style={[styles.dictCardName, { color: colors.text }]} numberOfLines={1}>
                    {g.name}
                  </Text>
                  <Text style={[styles.dictCardMeta, { color: colors.muted }]}>
                    {g.word_count} {wordCountLabel(g.word_count)}
                    {g.language ? ` · ${g.language}` : ''}
                  </Text>
                </View>
                <ChevronRight color={colors.muted} size={moderateScale(18)} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Свободное общение */}
      <View style={styles.choosingSection}>
        {groups.length > 0 && (
          <Text style={[styles.choosingSectionLabel, { color: colors.muted }]}>
            ИЛИ
          </Text>
        )}
        <TouchableOpacity
          style={[styles.freeChatCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary }]}
          onPress={handleFreeChat}
          activeOpacity={0.7}
        >
          <View style={[styles.dictCardIcon, { backgroundColor: colors.primary }]}>
            <MessageCircle color={colors.background} size={moderateScale(18)} />
          </View>
          <View style={styles.dictCardBody}>
            <Text style={[styles.dictCardName, { color: colors.primary }]}>
              Свободное общение
            </Text>
            <Text style={[styles.dictCardMeta, { color: colors.primary, opacity: 0.7 }]}>
              Выберем язык вместе
            </Text>
          </View>
          <ChevronRight color={colors.primary} size={moderateScale(18)} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: 'transparent' }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (isSmall ? spacing.xs : spacing.sm),
            borderBottomWidth: 0,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.botAvatarLarge, { backgroundColor: colors.primaryDim, width: isSmall ? moderateScale(36) : moderateScale(42), height: isSmall ? moderateScale(36) : moderateScale(42), borderRadius: isSmall ? moderateScale(18) : moderateScale(21) }]}>
            <Bot color={colors.primary} size={isSmall ? moderateScale(18) : moderateScale(22)} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text, fontSize: isSmall ? t.body - 2 : t.body }]}>Lexi</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {!profile?.is_premium && stage === 'active' && (
            <TouchableOpacity
              style={[styles.limitBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
            >
              <View style={styles.limitBadgeContent}>
                <View style={[styles.limitProgressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.limitProgressFill,
                      {
                        width: `${Math.min(100, Math.max(0, (messagesUsed ?? 0) / FREE_MESSAGES_LIMIT) * 100)}%`,
                        backgroundColor: (messagesUsed ?? 0) >= FREE_MESSAGES_LIMIT ? colors.danger : (messagesUsed ?? 0) >= FREE_MESSAGES_LIMIT * 0.7 ? '#FBBF24' : colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.limitBadgeText, { color: colors.muted }]}>
                  {messagesUsed ?? 0}/{FREE_MESSAGES_LIMIT}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {stage === 'active' && (
            <TouchableOpacity
              onPress={handleReset}
              hitSlop={{ top: spacing.sm, bottom: spacing.sm, left: spacing.sm, right: spacing.sm }}
              style={styles.clearBtn}
            >
              <RefreshCw color={colors.muted} size={moderateScale(18)} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Welcome ── */}
      {stage === 'welcome' && (
        <Animated.View style={[styles.welcomeOuter, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.welcomeScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.welcomeContent}>
              <View style={[styles.featureList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <FeatureRow icon={<MessageCircle color={colors.primary} size={isSmall ? moderateScale(14) : moderateScale(16)} />} text="Живой диалог на изучаемом языке" colors={colors} />
                <View style={[styles.featureDivider, { backgroundColor: colors.border }]} />
                <FeatureRow icon={<BookOpen color={colors.primary} size={isSmall ? moderateScale(14) : moderateScale(16)} />} text="Стараюсь использовать слова из вашего словаря." colors={colors} />
                <View style={[styles.featureDivider, { backgroundColor: colors.border }]} />
                <FeatureRow icon={<Sparkles color={colors.primary} size={isSmall ? moderateScale(14) : moderateScale(16)} />} text="Мягко исправляю ошибки, не прерывая разговор" colors={colors} />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.welcomeBottom, { paddingBottom: insets.bottom + (isSmall ? spacing.sm : spacing.md), borderTopColor: colors.border }]}>
            <View style={[styles.disclaimer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AlertCircle color={colors.muted} size={isSmall ? moderateScale(11) : moderateScale(13)} style={{ flexShrink: 0 }} />
              <Text style={[styles.disclaimerText, { color: colors.muted }]}>
                Контент генерирует нейросеть. ИИ может давать неточные ответы. Чат предназначен исключительно для языковой практики.
              </Text>
            </View>

            {isGuestMode && (
              <TouchableOpacity
                style={[styles.guestBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('SignIn')}
                activeOpacity={0.8}
              >
                <Text style={[styles.guestBannerText, { color: colors.textSecondary }]}>
                  Для AI-чата нужен аккаунт.
                </Text>
                <View style={styles.guestBannerLogin}>
                  <Text style={{ color: colors.primary, fontFamily: fonts.medium, fontSize: isSmall ? t.small - 1 : t.small }}>Войти</Text>
                  <LogIn color={colors.primary} size={isSmall ? moderateScale(11) : moderateScale(13)} />
                </View>
              </TouchableOpacity>
            )}

            {!isGuestMode && (
              <>
                <TouchableOpacity
                  style={[
                    styles.startBtn,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: moderateScale(isSmall ? 6 : 8) },
                      shadowOpacity: 0.5,
                      shadowRadius: moderateScale(isSmall ? 12 : 16),
                      elevation: 8,
                    },
                  ]}
                  onPress={handleStartPractice}
                  activeOpacity={0.85}
                >
                  <Sparkles color={colors.background} size={isSmall ? moderateScale(16) : moderateScale(18)} />
                  <Text style={[styles.startBtnText, { color: colors.background }]}>Начать практику</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Choosing ── */}
      {stage === 'choosing' && renderChoosingScreen()}

      {/* ── Active chat ── */}
      {stage === 'active' && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={scrollToBottom}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
          />

          {loading && (
            <View style={styles.typingContainer}>
              <View style={[styles.botAvatar, { backgroundColor: colors.primaryDim }]}>
                <Bot color={colors.primary} size={moderateScale(14)} />
              </View>
              <TypingIndicator />
            </View>
          )}

          <View
            style={[
              styles.inputContainer,
              {
                paddingBottom: insets.bottom + spacing.sm,
                borderTopWidth: 0,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder={limitReached ? 'Лимит исчерпан' : 'Написать сообщение...'}
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              editable={!limitReached}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: colors.primary },
                (!inputText.trim() || loading || limitReached) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || loading || limitReached}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color={colors.background} size="small" />
                : <Send color={colors.background} size={moderateScale(18)} />
              }
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
};

const MessageBubble = ({
  item,
  isUser,
  colors,
  onInsertHint,
  onRetry,
}: {
  item: ChatMessage;
  isUser: boolean;
  colors: any;
  onInsertHint?: (text: string) => void;
  onRetry?: (messageId: string) => void;
}) => {
  const styles = useChatStyles();
  const showActions = !isUser && isForeignText(item.content);
  const showRetry = isUser && item.sendStatus === 'failed';
  const [retrying, setRetrying] = useState(false);
  const retryPulse = useRef(new Animated.Value(1)).current;
  const [translation, setTranslation] = useState<string | null>(null);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);
  const hitSlop = { top: moderateScale(6), bottom: moderateScale(6), left: moderateScale(6), right: moderateScale(6) };

  // Cleanup при размонтировании — предотвращает setState на unmounted
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!showRetry || retrying) {
      retryPulse.setValue(1);
      return;
    }

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(retryPulse, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(retryPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.start();

    return () => pulseAnim.stop();
  }, [retrying, retryPulse, showRetry]);

  const callAction = async (action: 'translate' | 'hint'): Promise<string> => {
    const endpoint = action === 'translate' ? '/chat/translate' : '/chat/hint';
    const data = await apiPostWithRetry<{ result?: string }>(endpoint, { text: item.content });
    return data?.result ?? '';
  };

  const handleRetry = async () => {
    if (retrying || item.sendStatus !== 'failed') return;
    setRetrying(true);
    try {
      await onRetry?.(item.id);
    } finally {
      setRetrying(false);
    }
  };

  const handleTranslate = async () => {
    if (translating) return;
    if (translationOpen && translation) {
      setTranslationOpen(false);
      return;
    }
    if (translation) {
      setTranslationOpen(true);
      return;
    }
    setTranslating(true);
    try {
      const result = await callAction('translate');
      if (mountedRef.current) {
        setTranslation(result);
        setTranslationOpen(true);
      }
    } catch (err) {
      console.error('[handleTranslate] error:', err);
    } finally {
      if (mountedRef.current) setTranslating(false);
    }
  };

  const handleCopy = () => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(item.content).catch(() => {});
        }
      } else {
        Clipboard.setString(item.content);
      }
      setCopied(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API может быть недоступен
    }
  };

  const handleHint = async () => {
    if (hintLoading) return;
    if (hintOpen && hint) {
      setHintOpen(false);
      return;
    }
    if (hint) {
      setHintOpen(true);
      return;
    }
    setHintLoading(true);
    try {
      const result = await callAction('hint');
      if (mountedRef.current) {
        setHint(result);
        setHintOpen(true);
      }
    } catch (err) {
      console.error('[handleHint] error:', err);
    } finally {
      if (mountedRef.current) setHintLoading(false);
    }
  };

  const getHintOptions = () => {
    if (!hint) return [];
    const trimmed = hint.trim();
    if (!trimmed) return [];

    const lines = trimmed
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return [trimmed];
    }

    return lines
      // Remove full list markers like "1.", "2)", "-", "•" at line start.
      .map((line) => line.replace(/^(?:\d+[.)]\s*|[-•*]\s*)/, '').trim())
      .filter(Boolean);
  };

  const hintOptions = getHintOptions();

  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {showRetry && (
        <Animated.View
          style={[
            styles.retryButtonWrap,
            { transform: [{ scale: retryPulse }], opacity: retrying ? 0.8 : 1 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.retryButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={handleRetry}
            disabled={retrying}
            activeOpacity={0.75}
            hitSlop={hitSlop}
          >
            {retrying ? (
              <ActivityIndicator size={moderateScale(12)} color={colors.danger} />
            ) : (
              <RotateCcw size={moderateScale(12)} color={colors.danger} />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
      <View style={styles.bubbleWrapper}>
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.primary }]
            : [styles.bubbleBot, { backgroundColor: colors.card, borderColor: colors.border }],
        ]}>
          <Text style={[styles.bubbleText, { color: isUser ? colors.background : colors.text }]}>
            {item.content}
          </Text>

          {showActions && (
            <>
              {(translationOpen && translation) && (
                <>
                  <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.expandedLabel, { color: colors.muted }]}>Перевод</Text>
                  <Text style={[styles.expandedText, { color: colors.textSecondary }]}>{translation}</Text>
                </>
              )}

              {(hintOpen && hint) && (
                <>
                  <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.expandedLabel, { color: colors.muted }]}>Как ответить</Text>
                  {hintOptions.length > 0 ? (
                    <View style={styles.hintOptionsContainer}>
                      {hintOptions.map((option, idx) => (
                        <TouchableOpacity
                          key={`${idx}-${option.slice(0, 20)}`}
                          style={[
                            styles.hintOption,
                            {
                              backgroundColor: colors.elevated,
                              borderColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                          onPress={() => onInsertHint?.(option)}
                        >
                          <Text style={[styles.hintOptionText, { color: colors.text }]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.expandedText, { color: colors.textSecondary }]}>{hint}</Text>
                  )}
                </>
              )}

              <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
              <View style={styles.messageActions}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleTranslate}
                  activeOpacity={0.6}
                  hitSlop={hitSlop}
                >
                  {translating
                    ? <ActivityIndicator size={moderateScale(14)} color={colors.primary} />
                    : <Languages size={moderateScale(15)} color={translationOpen ? colors.primary : colors.muted} />
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleCopy}
                  activeOpacity={0.6}
                  hitSlop={hitSlop}
                >
                  <Copy size={moderateScale(15)} color={copied ? colors.success : colors.muted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={handleHint}
                  activeOpacity={0.6}
                  hitSlop={hitSlop}
                >
                  {hintLoading
                    ? <ActivityIndicator size={moderateScale(14)} color={colors.primary} />
                    : <Lightbulb size={moderateScale(15)} color={hintOpen ? colors.primary : colors.muted} />
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const FeatureRow = ({ icon, text, colors }: { icon: React.ReactNode; text: string; colors: any }) => {
  const styles = useChatStyles();
  return (
    <View style={styles.featureRow}>
      {icon}
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const wordCountLabel = (n: number) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'слов';
  if (mod10 === 1) return 'слово';
  if (mod10 >= 2 && mod10 <= 4) return 'слова';
  return 'слов';
};

const useChatStyles = () => {
  const { isSmall, isLarge, spacing, typography, radii } = useDeviceSize();
  const t = useResponsiveTypography();

  const adaptiveHeaderPadding = isSmall ? spacing.sm : spacing.md;

  return StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmall ? spacing.md : spacing.lg,
      paddingBottom: adaptiveHeaderPadding,
      borderBottomWidth: 0,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    botAvatarLarge: {
      width: moderateScale(42),
      height: moderateScale(42),
      borderRadius: moderateScale(21),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: t.body, fontFamily: fonts.headingBold },
    limitBadge: {
      borderRadius: radii.sm,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      minWidth: scale(72),
    },
    limitBadgeContent: { gap: moderateScale(4), alignItems: 'center' },
    limitProgressTrack: {
      height: moderateScale(3),
      borderRadius: moderateScale(2),
      width: scale(56),
      overflow: 'hidden',
    },
    limitProgressFill: { height: '100%', borderRadius: moderateScale(2) },
    limitBadgeText: { fontSize: t.xs, fontFamily: fonts.bold },
    clearBtn: { padding: spacing.xs },

    // Welcome
    welcomeOuter: { flex: 1 },
    welcomeScroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: isSmall ? spacing.md : spacing.xl,
      paddingTop: isSmall ? spacing.md : spacing.xl,
      paddingBottom: spacing.sm,
    },
    welcomeContent: { alignItems: 'center', gap: isSmall ? spacing.sm : spacing.md },
    featureList: {
      width: '100%',
      borderRadius: radii.md,
      borderWidth: 1,
      overflow: 'hidden',
      marginTop: spacing.xs,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmall ? spacing.xs : spacing.sm,
      paddingHorizontal: isSmall ? spacing.sm : spacing.md,
      paddingVertical: isSmall ? spacing.xs + 2 : spacing.sm + 2,
    },
    featureDivider: { height: 1, marginHorizontal: isSmall ? spacing.sm : spacing.md },
    featureText: { fontSize: isSmall ? t.xs : t.small, fontFamily: fonts.regular, flex: 1, lineHeight: moderateScale(isSmall ? 16 : 20) },
    welcomeBottom: {
      paddingTop: isSmall ? spacing.sm : spacing.md,
      paddingHorizontal: isSmall ? spacing.md : spacing.xl,
      gap: isSmall ? spacing.sm : spacing.md,
      borderTopWidth: 1,
    },
    disclaimer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmall ? spacing.xs : spacing.xs + 2,
      borderRadius: radii.sm,
      borderWidth: 1,
      padding: isSmall ? spacing.xs : spacing.sm + 2,
    },
    disclaimerText: { fontSize: isSmall ? t.xs - 1 : t.xs, fontFamily: fonts.regular, flex: 1, lineHeight: moderateScale(isSmall ? 14 : 18) },
    guestBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmall ? spacing.xs : spacing.sm,
      borderRadius: radii.sm,
      borderWidth: 1,
      padding: isSmall ? spacing.xs : spacing.sm + 2,
    },
    guestBannerText: { fontSize: isSmall ? t.small - 1 : t.small, fontFamily: fonts.regular, flex: 1 },
    guestBannerLogin: { flexDirection: 'row', alignItems: 'center', gap: moderateScale(4) },
    startBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isSmall ? spacing.xs : spacing.sm,
      borderRadius: radii.full,
      paddingVertical: isSmall ? spacing.sm : spacing.md,
      paddingHorizontal: isSmall ? spacing.lg : spacing.xl,
    },
    startBtnText: { fontSize: isSmall ? t.small : t.body, fontFamily: fonts.bold, letterSpacing: moderateScale(0.2) },

    // Choosing screen
    choosingScroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      gap: spacing.lg,
    },
    choosingGreeting: { alignItems: 'flex-start' },
    choosingBubble: {
      flex: 1,
      borderRadius: radii.lg,
      borderBottomLeftRadius: moderateScale(4),
      borderWidth: 1,
      padding: spacing.md,
    },
    choosingBubbleText: { fontSize: t.body, fontFamily: fonts.regular, lineHeight: moderateScale(22) },
    choosingSection: { gap: spacing.sm },
    choosingSectionLabel: {
      fontSize: t.xs,
      fontFamily: fonts.bold,
      letterSpacing: moderateScale(1.2),
      paddingLeft: spacing.xs,
    },
    choosingCards: { gap: spacing.sm },
    dictCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    freeChatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1.5,
      padding: spacing.md,
    },
    dictCardIcon: {
      width: moderateScale(40),
      height: moderateScale(40),
      borderRadius: radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dictCardBody: { flex: 1 },
    dictCardName: { fontSize: t.body, fontFamily: fonts.medium },
    dictCardMeta: { fontSize: t.xs, fontFamily: fonts.regular, marginTop: moderateScale(2) },

    // Messages
    messagesList: {
      padding: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    messageRowUser: { justifyContent: 'flex-end' },
    retryButtonWrap: {
      alignSelf: 'center',
      marginTop: moderateScale(6),
    },
    retryButton: {
      width: moderateScale(22),
      height: moderateScale(22),
      borderRadius: moderateScale(11),
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    botAvatar: {
      width: moderateScale(28),
      height: moderateScale(28),
      borderRadius: moderateScale(14),
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    bubbleWrapper: { maxWidth: '78%', gap: spacing.xs },
    bubble: {
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    bubbleBot: { borderBottomLeftRadius: moderateScale(4) },
    bubbleUser: { borderBottomRightRadius: moderateScale(4), borderWidth: 0 },
    bubbleText: { fontSize: t.body, fontFamily: fonts.regular, lineHeight: moderateScale(22) },
    messageActions: { flexDirection: 'row', gap: spacing.md },
    actionIconBtn: { opacity: 0.85 },
    actionDivider: { height: 1, marginVertical: spacing.sm },
    expandedLabel: {
      fontSize: t.xs,
      fontFamily: fonts.bold,
      letterSpacing: moderateScale(0.5),
      marginBottom: moderateScale(4),
      textTransform: 'uppercase',
    },
    expandedText: { fontSize: t.small, fontFamily: fonts.regular, lineHeight: moderateScale(20) },
    hintOptionsContainer: { marginTop: spacing.xs, gap: spacing.xs },
    hintOption: {
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    hintOptionText: {
      fontSize: t.body,
      fontFamily: fonts.medium,
      lineHeight: moderateScale(22),
    },
    typingContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },

    // Input
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.sm,
      borderTopWidth: 0,
    },
    input: {
      flex: 1,
      borderRadius: radii.md,
      borderWidth: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontSize: t.body,
      fontFamily: fonts.regular,
      maxHeight: verticalScale(120),
      minHeight: moderateScale(44),
    },
    sendButton: {
      width: moderateScale(44),
      height: moderateScale(44),
      borderRadius: moderateScale(22),
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
  });
};
