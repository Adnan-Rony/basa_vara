import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { C } from '../theme';

export default function TenantHomeScreen({ user }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 18 }}>
      <View style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 20, marginBottom: 14 }}>
        <Text style={{ fontSize: 28, marginBottom: 10 }}>🏠</Text>
        <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 7 }}>ভাড়াটিয়া ড্যাশবোর্ড</Text>
        <Text style={{ color: C.sub, lineHeight: 22 }}>স্বাগতম, {user.name}। আপনার অ্যাকাউন্ট তৈরি হয়েছে। পরের ধাপে বাড়িওয়ালার আমন্ত্রণ কোড দিয়ে বাসার সঙ্গে যুক্ত হওয়ার ব্যবস্থা যোগ করা হবে।</Text>
      </View>
      <View style={{ backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 16 }}>
        <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 12 }}>আপনার অ্যাকাউন্ট</Text>
        {[['নাম', user.name], ['ফোন নম্বর', user.phone], ['ধরন', 'ভাড়াটিয়া']].map(([label, value]) => (
          <View key={label} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line }}>
            <Text style={{ color: C.sub, fontSize: 12, marginBottom: 3 }}>{label}</Text>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginTop: 14 }}>
        <Text style={{ color: '#92400E', fontWeight: '700', marginBottom: 4 }}>পরবর্তী ধাপ</Text>
        <Text style={{ color: '#92400E', lineHeight: 20 }}>বাড়িওয়ালা আপনাকে যুক্ত করলে এখানে বাসার তথ্য, মাসিক ভাড়া ও বকেয়া দেখা যাবে। এই ভার্সনে এখনো বাসার সঙ্গে যুক্ত করার ফিচার নেই।</Text>
      </View>
    </ScrollView>
  );
}
