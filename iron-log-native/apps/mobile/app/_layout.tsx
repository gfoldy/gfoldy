import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '../src/db/store';
import { CloudProvider } from '../src/lib/cloud';
import { Onboarding } from '../src/components/Onboarding';
import { T } from '../src/theme';

function Gate() {
  const { ready, profile } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={T.gold} />
      </View>
    );
  }
  if (!profile) return <Onboarding />;
  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <CloudProvider>
        <StoreProvider>
          <Gate />
        </StoreProvider>
      </CloudProvider>
    </SafeAreaProvider>
  );
}
