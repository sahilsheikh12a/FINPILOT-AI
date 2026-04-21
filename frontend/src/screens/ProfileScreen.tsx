import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';

import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';
import { Card } from '../components/Card';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const confirmLogout = () => {
    Alert.alert(
      'Log out?',
      'You\'ll need to sign in again to access your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const income = (user as any)?.monthly_income;
  const city = (user as any)?.city;
  const email = (user as any)?.email;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.name || 'Guest'}</Text>
        <Text style={styles.phone}>{user?.phone || '—'}</Text>
      </View>

      {/* Account info */}
      <Text style={styles.sectionLabel}>Account</Text>
      <Card style={styles.card}>
        <InfoRow
          label="Monthly income"
          value={income ? `₹${Number(income).toLocaleString('en-IN')}` : 'Not set'}
        />
        <Divider />
        <InfoRow label="Email" value={email || 'Not set'} />
        <Divider />
        <InfoRow label="City" value={city || 'Not set'} />
      </Card>

      {/* Settings */}
      <Text style={styles.sectionLabel}>Settings</Text>
      <Card style={styles.card}>
        <SoonRow icon="🔔" label="Notifications" />
        <Divider />
        <SoonRow icon="💳" label="Budget setup" />
        <Divider />
        <SoonRow icon="🎨" label="Theme" value="Dark" />
        <Divider />
        <SoonRow icon="🔐" label="Change password" />
      </Card>

      {/* Danger */}
      <Text style={styles.sectionLabel}>Session</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
        <Text style={styles.logoutIcon}>🚪</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>FinPilot AI · v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SoonRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={value ? styles.rowValue : styles.rowSoon}>
        {value || 'Coming soon'}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  hero: { alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: Colors.primary + '33',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  avatarText: {
    color: Colors.primaryLight,
    fontSize: FontSize.xxl,
    fontWeight: '800',
  },
  name: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  phone: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },

  sectionLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  card: { marginBottom: Spacing.sm },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowIcon: { fontSize: 16, marginRight: Spacing.sm },
  rowLabel: { color: Colors.textSecondary, fontSize: FontSize.base },
  rowValue: { color: Colors.text, fontSize: FontSize.base, fontWeight: '600' },
  rowSoon: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    fontStyle: 'italic',
  },
  divider: { height: 1, backgroundColor: Colors.border },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.danger + '15',
    borderWidth: 1,
    borderColor: Colors.danger + '66',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  logoutIcon: { fontSize: 18, marginRight: Spacing.sm },
  logoutText: { color: Colors.danger, fontSize: FontSize.md, fontWeight: '700' },

  footer: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
