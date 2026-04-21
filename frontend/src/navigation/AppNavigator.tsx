import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import { Colors, FontSize } from '../utils/theme';
import { useAuthStore } from '../store/authStore';
import DashboardScreen from '../screens/DashboardScreen';
import ChatScreen from '../screens/ChatScreen';
import GoalsScreen from '../screens/GoalsScreen';
import EMIScreen from '../screens/EMIScreen';
import SMSSyncScreen from '../screens/SMSSyncScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TAB_ICONS: Record<string, string> = {
  Dashboard: '🏠',
  SMS: '💬',
  Goals: '🎯',
  EMI: '📊',
  Chat: '🤖',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name] || '📱'}</Text>
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: '600' },
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: FontSize.lg },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="SMS" component={SMSSyncScreen} options={{ headerTitle: 'SMS Sync' }} />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen name="EMI" component={EMIScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ headerTitle: 'AI Finance Copilot' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = user !== null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
