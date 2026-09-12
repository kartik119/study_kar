import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'splash' | 'auth' | 'student'>('auth');
  const [authStep, setAuthStep] = useState<'MOBILE' | 'OTP' | 'REGISTER' | 'GUARDIAN'>('MOBILE');

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [preparationLanguage, setPreparationLanguage] = useState<'kn' | 'en'>('kn');
  const [guardianMobile, setGuardianMobile] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedStudent, setAuthenticatedStudent] = useState<any>(null);

  const handleRequestOtp = () => {
    if (!mobile || mobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthStep('OTP');
    }, 600);
  };

  const handleVerifyOtp = () => {
    if (otp !== '123456' && otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit OTP (Test code: 123456)');
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthStep('REGISTER');
    }, 600);
  };

  const handleCompleteRegistration = () => {
    if (!fullName || !dateOfBirth) {
      setErrorMessage('Full name and Date of Birth are mandatory.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAuthenticatedStudent({
        fullName,
        dateOfBirth,
        preparationLanguage,
        mobile,
      });
      setCurrentRoute('student');
    }, 600);
  };

  const handleLogout = () => {
    setAuthenticatedStudent(null);
    setAuthStep('MOBILE');
    setCurrentRoute('auth');
  };

  if (currentRoute === 'splash') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#1e3a8a' }]}>
        <StatusBar style="light" />
        <View style={styles.splashBox}>
          <Text style={styles.splashTitle}>Study Karnataka</Text>
          <Text style={styles.splashSubtitle}>KPSC • KAS • PSI Mobile App</Text>
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Study Karnataka Mobile</Text>
        <Text style={styles.headerSubtitle}>Native Android & iOS Application</Text>
      </View>

      <ScrollView style={styles.content}>
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Validation Error</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => setErrorMessage(null)}>
              <Text style={styles.retryText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentRoute === 'auth' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Student Mobile Authentication</Text>

            {authStep === 'MOBILE' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Mobile Number (Indian 10-digit)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  value={mobile}
                  onChangeText={setMobile}
                  maxLength={10}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleRequestOtp} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Request OTP</Text>}
                </TouchableOpacity>
              </View>
            )}

            {authStep === 'OTP' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Enter 6-Digit OTP sent to {mobile}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOtp} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Verify OTP</Text>}
                </TouchableOpacity>
              </View>
            )}

            {authStep === 'REGISTER' && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter full name"
                  value={fullName}
                  onChangeText={setFullName}
                />

                <Text style={styles.inputLabel}>Date of Birth (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="1998-05-15"
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />

                <Text style={styles.inputLabel}>Preparation Language</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[styles.langBtn, preparationLanguage === 'kn' && styles.langBtnActive]}
                    onPress={() => setPreparationLanguage('kn')}
                  >
                    <Text style={[styles.langBtnText, preparationLanguage === 'kn' && styles.langBtnTextActive]}>
                      Kannada (ಕನ್ನಡ)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.langBtn, preparationLanguage === 'en' && styles.langBtnActive]}
                    onPress={() => setPreparationLanguage('en')}
                  >
                    <Text style={[styles.langBtnText, preparationLanguage === 'en' && styles.langBtnTextActive]}>
                      English Medium
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteRegistration} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>Complete Profile</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Authenticated Student Dashboard</Text>
            <Text style={styles.cardBody}>
              Welcome, {authenticatedStudent?.fullName || 'Student'}!
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Selected Language: {authenticatedStudent?.preparationLanguage === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 'English'}
            </Text>

            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24, backgroundColor: '#64748B' }]} onPress={handleLogout}>
              <Text style={styles.primaryBtnText}>Sign Out Mobile App</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fc',
  },
  splashBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  splashSubtitle: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e6eaf0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e6eaf0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#ef2323',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  langBtnActive: {
    borderColor: '#ef2323',
    backgroundColor: '#fdecec',
  },
  langBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  langBtnTextActive: {
    color: '#ef2323',
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#fdecec',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef2323',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ef2323',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#ef2323',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
});
