import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { goalAPI } from '../services/api';
import { Card } from '../components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

interface Goal {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  monthly_saving_required: number;
  progress_pct: number;
  months_remaining: number;
  status: string;
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: '', target_date: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await goalAPI.list();
      setGoals(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createGoal = async () => {
    if (!form.name || !form.target_amount) return Alert.alert('Error', 'Name and target amount required');
    setSaving(true);
    try {
      await goalAPI.create({
        name: form.name,
        target_amount: parseFloat(form.target_amount),
        target_date: form.target_date || undefined,
      });
      setShowModal(false);
      setForm({ name: '', target_amount: '', target_date: '' });
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Savings Goals</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ New Goal</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No goals yet. Set your first savings goal!</Text>
          </Card>
        ) : (
          goals.map((g) => (
            <Card key={g.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalName}>{g.name}</Text>
                <View style={[styles.statusBadge, g.status === 'completed' && styles.statusCompleted]}>
                  <Text style={styles.statusText}>{g.status}</Text>
                </View>
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.savedAmt}>₹{g.saved_amount?.toLocaleString('en-IN')}</Text>
                <Text style={styles.targetAmt}> / ₹{g.target_amount?.toLocaleString('en-IN')}</Text>
              </View>

              {/* Progress */}
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${Math.min(g.progress_pct || 0, 100)}%`,
                  backgroundColor: g.progress_pct >= 100 ? Colors.success : Colors.primary,
                }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressPct}>{g.progress_pct?.toFixed(1)}% complete</Text>
                {g.months_remaining && (
                  <Text style={styles.monthsLeft}>{g.months_remaining} months left</Text>
                )}
              </View>

              {g.monthly_saving_required > 0 && (
                <View style={styles.savingHint}>
                  <Text style={styles.savingHintText}>
                    Save ₹{g.monthly_saving_required?.toLocaleString('en-IN')}/month to reach this goal
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Savings Goal</Text>

            <Text style={styles.inputLabel}>Goal Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MacBook Pro, Trip to Goa"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={styles.inputLabel}>Target Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 150000"
              placeholderTextColor={Colors.textMuted}
              value={form.target_amount}
              onChangeText={(v) => setForm({ ...form, target_amount: v })}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Target Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={form.target_date}
              onChangeText={(v) => setForm({ ...form, target_date: v })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={createGoal} disabled={saving}>
                <Text style={styles.createText}>{saving ? 'Creating...' : 'Create Goal'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.lg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  addBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  goalCard: { marginBottom: Spacing.md },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  goalName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  statusBadge: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusCompleted: { backgroundColor: Colors.success + '22' },
  statusText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.sm },
  savedAmt: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  targetAmt: { color: Colors.textSecondary, fontSize: FontSize.base },
  progressBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  progressPct: { color: Colors.textMuted, fontSize: FontSize.xs },
  monthsLeft: { color: Colors.textMuted, fontSize: FontSize.xs },
  savingHint: { marginTop: Spacing.sm, backgroundColor: Colors.primary + '15', borderRadius: BorderRadius.sm, padding: Spacing.sm },
  savingHintText: { color: Colors.primary, fontSize: FontSize.sm },
  emptyText: { color: Colors.textSecondary, textAlign: 'center', padding: Spacing.lg },
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.lg },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border },
  modalButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  cancelBtn: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.text, fontWeight: '700' },
  createBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
});
