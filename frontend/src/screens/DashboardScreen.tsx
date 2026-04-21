import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import dayjs from 'dayjs';

import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { Card } from '../components/Card';
import { budgetAPI, transactionAPI, alertAPI } from '../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

const CATEGORY_COLORS: Record<string, string> = {
  food: '#FF6B6B',
  travel: '#4ECDC4',
  bills: '#45B7D1',
  emi: '#FFA502',
  shopping: '#A29BFE',
  entertainment: '#FD79A8',
  health: '#55EFC4',
  other: '#636E72',
};

interface BudgetData {
  total_budget: number;
  spent_so_far: number;
  remaining: number;
  overspend_probability: number;
  category_limits: Record<string, number>;
}

interface MonthlySummary {
  total_debit: number;
  category_breakdown: Record<string, number>;
}

export default function DashboardScreen({ navigation }: any) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const now = dayjs();

  const loadData = async () => {
    try {
      const [budgetRes, summaryRes, alertsRes] = await Promise.allSettled([
        budgetAPI.getCurrent(),
        transactionAPI.monthlySummary(now.month() + 1, now.year()),
        alertAPI.list(true),
      ]);

      if (budgetRes.status === 'fulfilled') setBudget(budgetRes.value.data);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (alertsRes.status === 'fulfilled') setUnreadAlerts(alertsRes.value.data.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const spentPct = budget ? Math.min((budget.spent_so_far / budget.total_budget) * 100, 100) : 0;
  const riskColor =
    !budget?.overspend_probability ? Colors.success :
    budget.overspend_probability < 0.4 ? Colors.success :
    budget.overspend_probability < 0.7 ? Colors.warning : Colors.danger;

  const chartData = summary
    ? Object.entries(summary.category_breakdown)
        .filter(([, v]) => v > 0)
        .map(([cat, amount]) => ({
          name: cat,
          amount,
          color: CATEGORY_COLORS[cat] || '#95A5A6',
          legendFontColor: Colors.textSecondary,
          legendFontSize: 11,
        }))
    : [];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good {now.hour() < 12 ? 'Morning' : now.hour() < 17 ? 'Afternoon' : 'Evening'} 👋</Text>
          <Text style={styles.month}>{now.format('MMMM YYYY')}</Text>
        </View>
        <View style={styles.alertBtn}>
          <Text style={styles.alertIcon}>🔔</Text>
          {unreadAlerts > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadAlerts}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Budget Card */}
      {budget ? (
        <Card style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <Text style={styles.cardLabel}>Monthly Budget</Text>
            <Text style={[styles.riskBadge, { backgroundColor: riskColor + '22', color: riskColor }]}>
              {budget.overspend_probability < 0.4 ? '✅ On Track' :
               budget.overspend_probability < 0.7 ? '⚠️ Watch Out' : '🚨 At Risk'}
            </Text>
          </View>
          <Text style={styles.budgetAmount}>₹{budget.remaining?.toLocaleString('en-IN')}</Text>
          <Text style={styles.budgetSub}>remaining of ₹{budget.total_budget?.toLocaleString('en-IN')}</Text>

          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${spentPct}%`, backgroundColor: riskColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Spent: ₹{budget.spent_so_far?.toLocaleString('en-IN')}</Text>
            <Text style={styles.progressText}>{spentPct.toFixed(0)}%</Text>
          </View>
        </Card>
      ) : (
        <View style={styles.noBudgetCard}>
          <Text style={styles.noBudgetText}>No budget set for this month</Text>
          <Text style={styles.noBudgetSub}>Budget setup coming soon</Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {[
          { icon: '💰', label: 'Transactions', screen: 'Transactions' },
          { icon: '🤖', label: 'AI Chat', screen: 'Chat' },
          { icon: '🎯', label: 'Goals', screen: 'Goals' },
          { icon: '📊', label: 'EMI', screen: 'EMI' },
        ].map(({ icon, label, screen }) => (
          <TouchableOpacity
            key={screen}
            style={styles.quickBtn}
            onPress={() => navigation.navigate(screen)}
          >
            <Text style={styles.quickIcon}>{icon}</Text>
            <Text style={styles.quickLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Spending Breakdown */}
      {chartData.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>This Month's Spending</Text>
          <PieChart
            data={chartData}
            width={SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2}
            height={200}
            chartConfig={{
              color: () => Colors.primary,
              labelColor: () => Colors.textSecondary,
              backgroundColor: Colors.surface,
              backgroundGradientFrom: Colors.surface,
              backgroundGradientTo: Colors.surface,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="10"
            absolute
          />
        </Card>
      )}

      {/* Spend by Category list */}
      {summary && Object.keys(summary.category_breakdown).length > 0 && (
        <Card style={{ marginTop: Spacing.md }}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {Object.entries(summary.category_breakdown)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([cat, amount]) => (
              <View key={cat} style={styles.categoryRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[cat] || '#95A5A6' }]} />
                  <Text style={styles.catName}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                </View>
                <Text style={styles.catAmount}>₹{amount.toLocaleString('en-IN')}</Text>
              </View>
            ))}
        </Card>
      )}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  month: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
  alertBtn: { position: 'relative', padding: Spacing.sm },
  alertIcon: { fontSize: 22 },
  badge: { position: 'absolute', top: 2, right: 2, backgroundColor: Colors.danger, borderRadius: 10, minWidth: 18, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700', paddingHorizontal: 3 },
  budgetCard: { marginBottom: Spacing.md },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  riskBadge: { fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  budgetAmount: { color: Colors.text, fontSize: FontSize.xxxl, fontWeight: '800' },
  budgetSub: { color: Colors.textMuted, fontSize: FontSize.sm, marginBottom: Spacing.md },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressText: { color: Colors.textMuted, fontSize: FontSize.xs },
  noBudgetCard: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  noBudgetText: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  noBudgetSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  quickBtn: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', flex: 1, marginHorizontal: 4 },
  quickIcon: { fontSize: 22, marginBottom: 4 },
  quickLabel: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: Spacing.md },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  catLeft: { flexDirection: 'row', alignItems: 'center' },
  catDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
  catName: { color: Colors.text, fontSize: FontSize.base },
  catAmount: { color: Colors.text, fontSize: FontSize.base, fontWeight: '600' },
});
