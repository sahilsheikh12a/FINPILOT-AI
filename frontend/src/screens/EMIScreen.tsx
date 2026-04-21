import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { emiAPI } from '../services/api';
import { Card } from '../components/Card';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

interface EMIAnalysis {
  total_emi_monthly: number;
  debt_to_income_ratio: number;
  stress_score: number;
  stress_label: string;
  recommendation: string;
  emis: any[];
}

const STRESS_COLORS: Record<string, string> = {
  Low: Colors.success,
  Medium: Colors.warning,
  High: Colors.danger,
  Critical: '#FF0000',
};

export default function EMIScreen() {
  const [analysis, setAnalysis] = useState<EMIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    loan_name: '', lender: '', principal: '', emi_amount: '',
    interest_rate: '', tenure_months: '', start_date: '',
  });

  const load = async () => {
    try {
      const { data } = await emiAPI.stressAnalysis();
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addEMI = async () => {
    if (!form.loan_name || !form.principal || !form.emi_amount) {
      return Alert.alert('Error', 'Fill in required fields');
    }
    try {
      await emiAPI.add({
        loan_name: form.loan_name,
        lender: form.lender || undefined,
        principal: parseFloat(form.principal),
        emi_amount: parseFloat(form.emi_amount),
        interest_rate: parseFloat(form.interest_rate || '0'),
        tenure_months: parseInt(form.tenure_months || '12'),
        start_date: form.start_date || new Date().toISOString().slice(0, 10),
      });
      setShowModal(false);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to add EMI');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  const stressColor = analysis ? STRESS_COLORS[analysis.stress_label] || Colors.textSecondary : Colors.textSecondary;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>EMI Analyzer</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
            <Text style={styles.addBtnText}>+ Add EMI</Text>
          </TouchableOpacity>
        </View>

        {analysis && (
          <>
            {/* Stress Score */}
            <Card style={styles.stressCard}>
              <Text style={styles.cardLabel}>EMI Stress Score</Text>
              <View style={styles.scoreRow}>
                <Text style={[styles.score, { color: stressColor }]}>{analysis.stress_score}/10</Text>
                <View style={[styles.label, { backgroundColor: stressColor + '22' }]}>
                  <Text style={[styles.labelText, { color: stressColor }]}>{analysis.stress_label}</Text>
                </View>
              </View>
              <View style={styles.scoreBar}>
                <View style={[styles.scoreFill, { width: `${(analysis.stress_score / 10) * 100}%`, backgroundColor: stressColor }]} />
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>₹{analysis.total_emi_monthly?.toLocaleString('en-IN')}</Text>
                  <Text style={styles.statLabel}>Monthly EMIs</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{(analysis.debt_to_income_ratio * 100).toFixed(0)}%</Text>
                  <Text style={styles.statLabel}>Debt-to-Income</Text>
                </View>
              </View>
              <View style={styles.recommendation}>
                <Text style={styles.recText}>{analysis.recommendation}</Text>
              </View>
            </Card>

            {/* Individual EMIs */}
            {analysis.emis.map((emi: any) => (
              <Card key={emi.id} style={styles.emiCard}>
                <View style={styles.emiHeader}>
                  <Text style={styles.emiName}>{emi.loan_name}</Text>
                  {emi.lender && <Text style={styles.emiLender}>{emi.lender}</Text>}
                </View>
                <View style={styles.emiStats}>
                  <View style={styles.emiStat}>
                    <Text style={styles.emiStatVal}>₹{emi.emi_amount?.toLocaleString('en-IN')}</Text>
                    <Text style={styles.emiStatLabel}>EMI/month</Text>
                  </View>
                  <View style={styles.emiStat}>
                    <Text style={styles.emiStatVal}>{emi.remaining_months}</Text>
                    <Text style={styles.emiStatLabel}>Months Left</Text>
                  </View>
                  <View style={styles.emiStat}>
                    <Text style={styles.emiStatVal}>₹{emi.outstanding_principal?.toLocaleString('en-IN')}</Text>
                    <Text style={styles.emiStatLabel}>Outstanding</Text>
                  </View>
                </View>
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    width: `${(emi.paid_months / emi.tenure_months) * 100}%`
                  }]} />
                </View>
                <Text style={styles.progressLabel}>{emi.paid_months}/{emi.tenure_months} months paid</Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Loan / EMI</Text>
            {[
              { key: 'loan_name', label: 'Loan Name *', placeholder: 'e.g., Home Loan' },
              { key: 'lender', label: 'Lender', placeholder: 'e.g., HDFC Bank' },
              { key: 'principal', label: 'Principal Amount (₹) *', placeholder: '2500000', numeric: true },
              { key: 'emi_amount', label: 'EMI Amount (₹) *', placeholder: '15000', numeric: true },
              { key: 'interest_rate', label: 'Interest Rate (%)', placeholder: '8.5', numeric: true },
              { key: 'tenure_months', label: 'Tenure (months)', placeholder: '240', numeric: true },
              { key: 'start_date', label: 'Start Date', placeholder: 'YYYY-MM-DD' },
            ].map(({ key, label, placeholder, numeric }) => (
              <View key={key}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm({ ...form, [key]: v })}
                  keyboardType={numeric ? 'numeric' : 'default'}
                />
              </View>
            ))}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={addEMI}>
                <Text style={styles.createText}>Add EMI</Text>
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
  stressCard: { marginBottom: Spacing.md },
  cardLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', textTransform: 'uppercase', marginBottom: Spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  score: { fontSize: FontSize.xxxl, fontWeight: '800' },
  label: { borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4 },
  labelText: { fontWeight: '700', fontSize: FontSize.sm },
  scoreBar: { height: 10, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.md },
  scoreFill: { height: '100%', borderRadius: 5 },
  statsRow: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md },
  statItem: {},
  statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  recommendation: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  recText: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  emiCard: { marginBottom: Spacing.md },
  emiHeader: { marginBottom: Spacing.sm },
  emiName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  emiLender: { color: Colors.textSecondary, fontSize: FontSize.sm },
  emiStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  emiStat: { alignItems: 'center' },
  emiStatVal: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  emiStatLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  progressBg: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, maxHeight: '85%' },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', marginBottom: Spacing.md },
  inputLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 4, marginTop: Spacing.sm },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border },
  modalButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelText: { color: Colors.text, fontWeight: '700' },
  createBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  createText: { color: '#fff', fontWeight: '700' },
});
