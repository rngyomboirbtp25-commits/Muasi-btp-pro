import { Tabs } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Text } from 'react-native';
import { StoreProvider } from '../lib/store';
import { colors } from '../lib/theme';

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 28 : 24, opacity: focused ? 1 : 0.7 }}>{glyph}</Text>;
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: colors.dark },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '900', fontSize: 22 },
          tabBarStyle: {
            backgroundColor: colors.dark,
            height: 76,
            paddingTop: 6,
            paddingBottom: 10,
            borderTopWidth: 0,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#DDDDDD',
          tabBarLabelStyle: { fontSize: 13, fontWeight: '800' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Béton',
            headerTitle: 'ChantierPro · Béton',
            tabBarIcon: ({ focused }) => <TabIcon glyph="🧱" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="ferraillage"
          options={{
            title: 'Ferraillage',
            headerTitle: 'ChantierPro · Ferraillage',
            tabBarIcon: ({ focused }) => <TabIcon glyph="🔩" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="devis"
          options={{
            title: 'Devis',
            headerTitle: 'ChantierPro · Devis',
            tabBarIcon: ({ focused }) => <TabIcon glyph="🧾" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="planning"
          options={{
            title: 'Planning',
            headerTitle: 'ChantierPro · Planning',
            tabBarIcon: ({ focused }) => <TabIcon glyph="📅" focused={focused} />,
          }}
        />
      </Tabs>
    </StoreProvider>
  );
}
