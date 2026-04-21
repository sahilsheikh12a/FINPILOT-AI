import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatAPI } from '../services/api';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Can I afford a ₹50,000 laptop?',
  'Why am I overspending?',
  'How much can I save this month?',
  'Analyze my EMI burden',
  'Which subscriptions should I cancel?',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm FinPilot, your AI finance copilot 🤖\n\nI can help you understand your spending, plan budgets, analyze EMIs, and answer any financial question. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const flatRef = useRef<FlatList>(null);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await chatAPI.send(msg, sessionId);
      if (!sessionId) setSessionId(data.session_id);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please check your internet and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && <Text style={styles.avatar}>🤖</Text>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
      />

      {loading && (
        <View style={styles.typingRow}>
          <Text style={styles.avatar}>🤖</Text>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.typingText}> FinPilot is thinking...</Text>
          </View>
        </View>
      )}

      {/* Suggestions */}
      {messages.length === 1 && (
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity key={s} onPress={() => sendMessage(s)} style={styles.chip}>
              <Text style={styles.chipText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputRow, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything about your finances..."
          placeholderTextColor={Colors.textMuted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: Spacing.sm },
  msgRow: { flexDirection: 'row', marginBottom: Spacing.md, alignItems: 'flex-end' },
  msgRowUser: { flexDirection: 'row-reverse' },
  avatar: { fontSize: 24, marginHorizontal: Spacing.xs },
  bubble: { maxWidth: '78%', padding: Spacing.md, borderRadius: BorderRadius.lg },
  bubbleAI: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleText: { color: Colors.text, fontSize: FontSize.base, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', padding: Spacing.md, alignItems: 'center' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: BorderRadius.md },
  typingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  suggestions: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  chipText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  inputRow: { flexDirection: 'row', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, alignItems: 'flex-end', gap: Spacing.sm },
  input: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, fontSize: FontSize.base, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { backgroundColor: Colors.primary, width: 44, height: 44, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.surfaceLight },
  sendIcon: { color: '#fff', fontSize: 16 },
});
