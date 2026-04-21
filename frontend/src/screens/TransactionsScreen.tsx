import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { transactionAPI } from '../services/api';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

type TxnType = 'debit' | 'credit';

interface Txn {
  id: string;
  amount: number;
  type: TxnType;
  category: string;
  merchant: string | null;
  description: string | null;
  bank: string | null;
  is_fraud_flagged: boolean;
  ml_confidence: number | null;
  transacted_at: string;
  created_at: string;
}

type FilterType = 'all' | 'debit' | 'credit';

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  food: { icon: '🍽️', color: '#FF6B6B' },
  travel: { icon: '✈️', color: '#4ECDC4' },
  bills: { icon: '💡', color: '#45B7D1' },
  emi: { icon: '📅', color: '#FFA502' },
  shopping: { icon: '🛍️', color: '#A29BFE' },
  entertainment: { icon: '🎬', color: '#FD79A8' },
  health: { icon: '💊', color: '#55EFC4' },
  education: { icon: '📚', color: '#74B9FF' },
  salary: { icon: '💰', color: '#2ED573' },
  investment: { icon: '📈', color: '#00C896' },
  transfer: { icon: '🔄', color: '#636E72' },
  upi: { icon: '⚡', color: '#6C5CE7' },
  atm: { icon: '🏧', color: '#B2BEC3' },
  other: { icon: '💳', color: '#95A5A6' },
};

function bucketFor(dateStr: string): string {
  const d = dayjs(dateStr);
  if (d.isToday()) return 'Today';
  if (d.isYesterday()) return 'Yesterday';
  if (d.isAfter(dayjs().subtract(7, 'day'))) return 'This Week';
  if (d.isAfter(dayjs().subtract(30, 'day'))) return 'This Month';
  return d.format('MMMM YYYY');
}

type Row =
  | { kind: 'header'; label: string }
  | { kind: 'txn'; txn: Txn };

export default function TransactionsScreen() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await transactionAPI.list({ page: 1, page_size: 100 });
      setTxns(data.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => (filter === 'all' ? txns : txns.filter((t) => t.type === filter)),
    [txns, filter],
  );

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastBucket = '';
    for (const t of filtered) {
      const b = bucketFor(t.transacted_at);
      if (b !== lastBucket) {
        out.push({ kind: 'header', label: b });
        lastBucket = b;
      }
      out.push({ kind: 'txn', txn: t });
    }
    return out;
  }, [filtered]);

  const { totalDebit, totalCredit } = useMemo(() => {
    let d = 0, c = 0;
    for (const t of txns) {
      if (t.type === 'debit') d += Number(t.amount);
      else c += Number(t.amount);
    }
    return { totalDebit: d, totalCredit: c };
  }, [txns]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.subtitle}>
          {txns.length} {txns.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      {/* Totals row */}
      <View style={styles.totalsRow}>
        <View style={[styles.totalBox, { borderLeftColor: Colors.danger }]}>
          <Text style={styles.totalLabel}>Spent</Text>
          <Text style={[styles.totalValue, { color: Colors.danger }]}>
            ₹{totalDebit.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={[styles.totalBox, { borderLeftColor: Colors.success }]}>
          <Text style={styles.totalLabel}>Received</Text>
          <Text style={[styles.totalValue, { color: Colors.success }]}>
            ₹{totalCredit.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'debit', 'credit'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filterPill,
              filter === f && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.filterTextActive,
              ]}
            >
              {f === 'all' ? 'All' : f === 'debit' ? 'Spent' : 'Received'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : null}

      {/* List */}
      <FlatList
        data={rows}
        keyExtractor={(r, i) => r.kind === 'header' ? `h-${r.label}-${i}` : `t-${r.txn.id}`}
        renderItem={({ item }) =>
          item.kind === 'header' ? (
            <Text style={styles.sectionHeader}>{item.label}</Text>
          ) : (
            <TxnRow txn={item.txn} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptyBody}>
              Head to the SMS tab and run a sync to auto-import transactions from your bank SMS.
            </Text>
          </View>
        )}
        contentContainerStyle={
          rows.length === 0
            ? { flexGrow: 1, justifyContent: 'center' }
            : { paddingBottom: Spacing.xxl }
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function TxnRow({ txn }: { txn: Txn }) {
  const meta = CATEGORY_META[txn.category] || CATEGORY_META.other;
  const isDebit = txn.type === 'debit';
  const amountColor = isDebit ? Colors.text : Colors.success;
  const amount = Number(txn.amount).toLocaleString('en-IN');
  const when = dayjs(txn.transacted_at);

  return (
    <View style={styles.txnRow}>
      <View style={[styles.catIcon, { backgroundColor: meta.color + '22' }]}>
        <Text style={styles.catIconText}>{meta.icon}</Text>
      </View>
      <View style={styles.txnMiddle}>
        <View style={styles.txnTopLine}>
          <Text style={styles.txnMerchant} numberOfLines={1}>
            {txn.merchant || txn.description || 'Unknown'}
          </Text>
          {txn.is_fraud_flagged && (
            <Text style={styles.fraudBadge}>⚠️</Text>
          )}
        </View>
        <View style={styles.txnBottomLine}>
          <Text style={[styles.catChip, { color: meta.color }]}>
            {txn.category}
          </Text>
          {txn.bank ? <Text style={styles.dot}>·</Text> : null}
          {txn.bank ? <Text style={styles.txnMeta}>{txn.bank}</Text> : null}
          <Text style={styles.dot}>·</Text>
          <Text style={styles.txnMeta}>{when.format('h:mm A')}</Text>
        </View>
      </View>
      <Text style={[styles.txnAmount, { color: amountColor }]}>
        {isDebit ? '−' : '+'}₹{amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  header: { marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },

  totalsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  totalBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  totalLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  totalValue: { fontSize: FontSize.lg, fontWeight: '800', marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '700' },
  filterTextActive: { color: '#fff' },

  errorBox: {
    backgroundColor: Colors.danger + '22',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },

  sectionHeader: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
    marginBottom: 6,
  },
  catIcon: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  catIconText: { fontSize: 20 },
  txnMiddle: { flex: 1, marginRight: Spacing.sm },
  txnTopLine: { flexDirection: 'row', alignItems: 'center' },
  txnMerchant: { color: Colors.text, fontSize: FontSize.base, fontWeight: '600', flexShrink: 1 },
  fraudBadge: { fontSize: 12, marginLeft: 6 },
  txnBottomLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  catChip: { fontSize: FontSize.xs, fontWeight: '700', textTransform: 'capitalize' },
  dot: { color: Colors.textMuted, marginHorizontal: 4 },
  txnMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  txnAmount: { fontSize: FontSize.md, fontWeight: '800' },

  empty: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.sm },
  emptyTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
