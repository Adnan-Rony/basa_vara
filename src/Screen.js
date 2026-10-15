import React from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { Header } from './ui';
import { C } from './theme';

export default function Screen({ title, onBack, right, children, scroll = true }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={title} onBack={onBack} right={right} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ padding: 14, paddingBottom: 48 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </View>
  );
}
