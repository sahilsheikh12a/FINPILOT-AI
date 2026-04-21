import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Spacing, FontSize, BorderRadius } from '../utils/theme';

export default function RegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({ name: '', phone: '', password: '', monthly_income: '' });
  const { register: doRegister, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.password) {
      return Alert.alert('Error', 'Name, phone and password are required');
    }
    await doRegister({
      name: form.name,
      phone: form.phone.startsWith('+91') ? form.phone : `+91${form.phone}`,
      password: form.password,
      monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : undefined,
    });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>FinPilot AI</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {[
            { key: 'name', label: 'Full Name', placeholder: 'Rahul Sharma' },
            { key: 'phone', label: 'Mobile Number', placeholder: '+91 9876543210', keyboardType: 'phone-pad' as const },
            { key: 'password', label: 'Password', placeholder: 'Min 8 characters', secure: true },
            { key: 'monthly_income', label: 'Monthly Income (₹)', placeholder: '50000', keyboardType: 'numeric' as const },
          ].map(({ key, label, placeholder, secure, keyboardType }) => (
            <View key={key}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                value={(form as any)[key]}
                onChangeText={(v) => { setForm({ ...form, [key]: v }); clearError(); }}
                secureTextEntry={secure}
                keyboardType={keyboardType}
              />
            </View>
          ))}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.btnText}>{isLoading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.switchLink}>
            <Text style={styles.switchText}>Already have an account? <Text style={styles.switchAccent}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: { fontSize: 48 },
  appName: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '800', marginTop: Spacing.sm },
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
});
