import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from '../i18n';
import { AppIcon } from '../ui';

const GOLD = '#D2B27A';

// ~1.25s: gold ring + house fade/scale in, name rises, then the whole screen fades into Home.
export default function SplashScreen({ onDone }) {
  const pop = useRef(new Animated.Value(0)).current;
  const txt = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(pop, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
        Animated.timing(txt, { toValue: 1, duration: 450, delay: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(280),
      Animated.timing(out, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: out, zIndex: 99, backgroundColor: '#07241F', transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1] }) }] },
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#0B3A33', borderWidth: 1.5, borderColor: GOLD,
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          }}
        >
          <AppIcon name="home" size={50} color={GOLD} />
        </Animated.View>
        <Animated.View
          style={{
            alignItems: 'center', marginTop: 26, opacity: txt,
            transform: [{ translateY: txt.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
          }}
        >
          <Text style={{ color: '#F3EEE2', fontSize: 26, fontWeight: '800', letterSpacing: 0.3 }}>বাড়িভাড়া ম্যানেজার</Text>
          <View style={{ width: 28, height: 2, borderRadius: 2, backgroundColor: GOLD, marginVertical: 10 }} />
          <Text style={{ color: 'rgba(243,238,226,0.7)', fontSize: 14, letterSpacing: 0.4 }}>ভাড়া আদায় সহজ</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
