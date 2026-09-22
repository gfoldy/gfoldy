import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { StoreProvider, useStore } from '../src/store/store';
import { T } from '../src/theme';

function Loader() {
  return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={T.accent} />
    </View>
  );
}

function Gate() {
  const { ready } = useStore();
  if (!ready) return <Loader />;
  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  if (!fontsLoaded) return <Loader />;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <StoreProvider>
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
