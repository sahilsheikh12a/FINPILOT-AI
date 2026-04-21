import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, PermissionsAndroid, Platform, Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { Card } from '../components/Card';
import { transactionAPI } from '../services/api';

dayjs.extend(relativeTime);

let SmsAndroid: any = null;
try {
  if (Platform.OS === 'android') {
    SmsAndroid = require('react-native-get-sms-android');
  }
} catch {
  SmsAndroid = null;
}

const LAST_SYNC_KEY = 'sms_last_sync_ts';
const BATCH_SIZE = 200;

const BANK_SENDER_KEYWORDS = [
  'HDFC', 'SBIIN', 'SBI', 'ICICI', 'AXIS', 'KOTAK', 'BOB', 'PNB',
  'INDUSB', 'YESBNK', 'YESB', 'IDBI', 'IDFC', 'RBL', 'CITI', 'HSBC',
  'CANBK', 'UNIONB', 'FEDBNK', 'AUBANK',
  'PAYTM', 'PHONEP', 'PHONEPE', 'GPAY', 'AMAZON', 'BHIM', 'UPI',
  'AMZPAY', 'MOBKWK', 'FRCARD', 'SLICE',
];

const SUPPORTED_BANKS = [
  { name: 'HDFC', icon: '🏦' },
  { name: 'SBI', icon: '🏛️' },
  { name: 'ICICI', icon: '🏦' },
  { name: 'Axis', icon: '🏦' },
  { name: 'Kotak', icon: '🏦' },
  { name: 'Paytm', icon: '💸' },
  { name: 'PhonePe', icon: '💜' },
  { name: 'GPay', icon: '💳' },
  { name: 'UPI', icon: '⚡' },
];

interface SyncResult {
  received: number;
  saved: number;
  duplicates: number;
  unparseable: number;
}

interface SmsMessage {
  _id: number;
  address: string;
  body: string;
  date: number;
}

type PermState = 'unknown' | 'granted' | 'denied' | 'unsupported';

export default function SMSSyncScreen() {
  const [permState, setPermState] = useState<PermState>('unknown');
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [progressPct, setProgressPct] = useState(0);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [scannedCount, setScannedCount] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem(LAST_SYNC_KEY).then((v) => {
      if (v) setLastSync(parseInt(v, 10));
    });
    if (Platform.OS !== 'android' || !SmsAndroid) {
      setPermState('unsupported');
    }
  }, []);

  useEffect(() => {
    if (syncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [syncing, pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progressPct, progressAnim]);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android only', 'Reading SMS is not supported on iOS.');
      setPermState('unsupported');
      return false;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'Read SMS permission',
          message: 'FinPilot needs to read bank SMS to track your transactions automatically.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      setPermState(ok ? 'granted' : 'denied');
      return ok;
    } catch {
      setPermState('denied');
      return false;
    }
  };

  const isBankSender = (address: string): boolean => {
    const addr = (address || '').toUpperCase();
    return BANK_SENDER_KEYWORDS.some((k) => addr.includes(k));
  };

  const readSmsSince = (sinceTs: number): Promise<SmsMessage[]> =>
    new Promise((resolve, reject) => {
      if (!SmsAndroid) {
        reject(new Error('SMS module unavailable (dev build required)'));
        return;
      }
      const filter = { box: 'inbox', minDate: sinceTs, maxCount: 5000 };
      SmsAndroid.list(
        JSON.stringify(filter),
        (err: string) => reject(new Error(err)),
        (_count: number, smsList: string) => {
          try {
            resolve(JSON.parse(smsList) as SmsMessage[]);
          } catch (e) {
            reject(e);
          }
        },
      );
    });

  const runSync = async () => {
    const ok = permState === 'granted' || (await requestPermission());
    if (!ok) return;
    if (!SmsAndroid) {
      Alert.alert(
        'Dev build required',
        'SMS reading needs a dev-client build. Run: npx expo prebuild && npx react-native run-android',
      );
      return;
    }

    setSyncing(true);
    setResult(null);
    setProgressPct(0);
    setProgress('Reading SMS inbox...');

    try {
      const since = lastSync ?? 0;
      const all = await readSmsSince(since);
      const bankSms = all.filter((m) => isBankSender(m.address));
      setScannedCount(bankSms.length);

      if (bankSms.length === 0) {
        setProgress('No new bank SMS found.');
        setProgressPct(1);
        const nowTs = Date.now();
        await AsyncStorage.setItem(LAST_SYNC_KEY, String(nowTs));
        setLastSync(nowTs);
        setSyncing(false);
        return;
      }

      const agg: SyncResult = { received: 0, saved: 0, duplicates: 0, unparseable: 0 };

      for (let i = 0; i < bankSms.length; i += BATCH_SIZE) {
        const slice = bankSms.slice(i, i + BATCH_SIZE);
        setProgress(`Uploading ${i + slice.length} / ${bankSms.length}...`);
        setProgressPct((i + slice.length) / bankSms.length);
        const payload = {
          messages: slice.map((m) => ({
            sms_text: m.body,
            sender: m.address,
            received_at: new Date(m.date).toISOString(),
          })),
        };
        const { data } = await transactionAPI.parseBatchSMS(payload);
        agg.received += data.received;
        agg.saved += data.saved;
        agg.duplicates += data.duplicates;
        agg.unparseable += data.unparseable;
      }

      setResult(agg);
      setProgress('');
      setProgressPct(1);
      const nowTs = Date.now();
      await AsyncStorage.setItem(LAST_SYNC_KEY, String(nowTs));
      setLastSync(nowTs);
    } catch (e: any) {
      Alert.alert('Sync failed', e?.message || 'Unable to sync SMS');
      setProgress('');
    } finally {
      setSyncing(false);
    }
  };

  const resetSync = async () => {
    Alert.alert(
      'Reset sync history?',
      'Next sync will re-scan your entire inbox. Duplicates are still skipped server-side.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(LAST_SYNC_KEY);
            setLastSync(null);
            setResult(null);
          },
        },
      ],
    );
  };

  const permPill = {
    unknown: { label: 'Not requested', color: Colors.textMuted, bg: Colors.textMuted + '22' },
    granted: { label: 'Granted', color: Colors.success, bg: Colors.success + '22' },
    denied: { label: 'Denied', color: Colors.danger, bg: Colors.danger + '22' },
    unsupported: { label: Platform.OS === 'ios' ? 'iOS not supported' : 'Dev build required', color: Colors.warning, bg: Colors.warning + '22' },
  }[permState];

  const hasSynced = lastSync !== null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Text style={styles.heroIcon}>📨</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>SMS Sync</Text>
          <Text style={styles.heroSubtitle}>
            Auto-track spending by reading your bank SMS
          </Text>
        </View>
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        <View style={[styles.pill, { backgroundColor: permPill.bg }]}>
          <View style={[styles.pillDot, { backgroundColor: permPill.color }]} />
          <Text style={[styles.pillText, { color: permPill.color }]}>
            {permPill.label}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: Colors.primary + '22' }]}>
          <Text style={[styles.pillText, { color: Colors.primaryLight }]}>
            {hasSynced ? `Synced ${dayjs(lastSync!).fromNow()}` : 'Never synced'}
          </Text>
        </View>
      </View>

      {/* Primary action */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.primaryBtn, syncing && styles.btnDisabled]}
          onPress={runSync}
          disabled={syncing}
          activeOpacity={0.85}
        >
          {syncing ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.primaryBtnText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.primaryBtnIcon}>{hasSynced ? '🔄' : '🚀'}</Text>
              <Text style={styles.primaryBtnText}>
                {hasSynced ? 'Sync New Messages' : 'Start First Sync'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Progress bar */}
      {(syncing || progress.length > 0) && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>{progress || 'Done'}</Text>
        </View>
      )}

      {/* Results grid */}
      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.sectionLabel}>Latest Sync</Text>
          <View style={styles.statGrid}>
            <StatBox
              icon="📥"
              label="Scanned"
              value={scannedCount}
              tint={Colors.info}
            />
            <StatBox
              icon="✅"
              label="New Txns"
              value={result.saved}
              tint={Colors.success}
              emphasize
            />
            <StatBox
              icon="♻️"
              label="Duplicates"
              value={result.duplicates}
              tint={Colors.textMuted}
            />
            <StatBox
              icon="⚠️"
              label="Unparseable"
              value={result.unparseable}
              tint={Colors.warning}
            />
          </View>
        </View>
      )}

      {/* Supported banks */}
      <Text style={styles.sectionLabel}>Supported Senders</Text>
      <View style={styles.chipRow}>
        {SUPPORTED_BANKS.map((b) => (
          <View key={b.name} style={styles.chip}>
            <Text style={styles.chipIcon}>{b.icon}</Text>
            <Text style={styles.chipText}>{b.name}</Text>
          </View>
        ))}
      </View>

      {/* How it works */}
      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        {[
          { n: '1', t: 'Reads your Android inbox (on-device)' },
          { n: '2', t: 'Filters messages from known bank & UPI senders' },
          { n: '3', t: 'Parses amount, merchant, debit / credit' },
          { n: '4', t: 'Uploads securely — duplicates are skipped' },
        ].map((s) => (
          <View key={s.n} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{s.n}</Text>
            </View>
            <Text style={styles.stepText}>{s.t}</Text>
          </View>
        ))}
      </Card>

      {hasSynced && (
        <TouchableOpacity onPress={resetSync} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset sync history</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function StatBox({
  icon,
  label,
  value,
  tint,
  emphasize,
}: {
  icon: string;
  label: string;
  value: number;
  tint: string;
  emphasize?: boolean;
}) {
  return (
    <View
      style={[
        styles.statBox,
        emphasize && { borderColor: tint, backgroundColor: tint + '11' },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: tint + '22' }]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroIcon: { fontSize: 28 },
  heroTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  heroSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },

  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  pillText: { fontSize: FontSize.xs, fontWeight: '700' },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: Spacing.md,
  },
  btnDisabled: { opacity: 0.75 },
  primaryBtnIcon: { fontSize: 20, marginRight: Spacing.sm },
  primaryBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700', marginLeft: Spacing.sm },

  progressWrap: { marginBottom: Spacing.lg },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },

  resultSection: { marginBottom: Spacing.lg },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  statBox: {
    width: '50%',
    padding: Spacing.xs,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: { fontSize: 18 },
  statValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipIcon: { fontSize: 12, marginRight: 4 },
  chipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  infoCard: { marginBottom: Spacing.md },
  infoTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  stepBadgeText: {
    color: Colors.primaryLight,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  stepText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },

  resetBtn: { alignItems: 'center', padding: Spacing.md },
  resetText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textDecorationLine: 'underline',
  },
});
