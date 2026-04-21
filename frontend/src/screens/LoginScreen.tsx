import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

export default function LoginScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!phone || !password) return Alert.alert('Error', 'Enter phone and password');
    await login(phone.startsWith('+91') ? phone : `+91${phone}`, password);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>FinPilot AI</Text>
          <Text style={styles.tagline}>Your AI-powered finance copilot</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={(t) => { setPhone(t); clearError(); }}
            keyboardType="phone-pad"
            maxLength={13}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={(t) => { setPassword(t); clearError(); }}
            secureTextEntry
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.btnText}>{isLoading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchLink}>
            <Text style={styles.switchText}>Don't have an account? <Text style={styles.switchAccent}>Register</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.devSkip}>
            <Text style={styles.devSkipText}>Skip Login (Dev)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 56 },
  appName: { color: Colors.text, fontSize: FontSize.xxxl, fontWeight: '800', marginTop: Spacing.sm },
  tagline: { color: Colors.textSecondary, fontSize: FontSize.base, marginTop: 4 },
  form: {},
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.base, borderWidth: 1, borderColor: Colors.border },
  errorText: { color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.sm },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  switchLink: { alignItems: 'center', marginTop: Spacing.lg },
  switchText: { color: Colors.textSecondary, fontSize: FontSize.base },
  switchAccent: { color: Colors.primary, fontWeight: '700' },
  devSkip: { alignItems: 'center', marginTop: Spacing.xl, padding: Spacing.sm },
  devSkipText: { color: Colors.textMuted, fontSize: FontSize.sm, borderBottomWidth: 1, borderBottomColor: Colors.textMuted },
});
