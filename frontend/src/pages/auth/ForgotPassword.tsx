import { useState } from 'react';
import {
  Paper, TextInput, PasswordInput, Button, Title, Text,
  Stack, Center, Box, Alert, Transition,
} from '@mantine/core';
import { IconMail, IconLock, IconAlertCircle, IconKey, IconArrowLeft } from '@tabler/icons-react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../lib/axios';

export default function ForgotPassword() {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Email wajib diisi');
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMsg(res.data.message);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Terjadi kesalahan saat mengirim email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Masukkan 6 digit OTP yang valid');
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newPassword || !confirmPassword) {
      setError('Semua field wajib diisi');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, otp, newPassword });
      setSuccessMsg(res.data.message);
      // Optional: Delay before redirect
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal mengubah password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <Transition mounted={true} transition="fade" duration={600}>
        {(styles) => (
          <Paper
            shadow="xl"
            p="xl"
            radius="lg"
            style={{
              ...styles,
              width: '100%',
              maxWidth: 420,
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Stack gap="lg">
              <Center>
                <Box
                  style={{
                    width: 60, height: 60, borderRadius: 16,
                    background: 'linear-gradient(135deg, #228be6, #6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 8px 32px rgba(34, 139, 230, 0.3)',
                  }}
                >
                  <IconKey size={32} color="white" stroke={1.5} />
                </Box>
              </Center>

              <Box ta="center">
                <Title order={3} c="white" fw={700}>Lupa Password</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  {step === 1 && 'Masukkan email terdaftar Anda'}
                  {step === 2 && 'Cek kotak masuk email Anda'}
                  {step === 3 && 'Buat password baru Anda'}
                </Text>
              </Box>

              {error && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                  {error}
                </Alert>
              )}
              
              {successMsg && (
                <Alert color="green" variant="light" radius="md">
                  {successMsg}
                </Alert>
              )}

              {step === 1 && (
                <form onSubmit={handleSendEmail}>
                  <Stack gap="md">
                    <TextInput
                      label="Email"
                      placeholder="Masukkan email Anda"
                      value={email}
                      onChange={(e) => setEmail(e.currentTarget.value)}
                      leftSection={<IconMail size={16} />}
                      styles={{ label: { color: '#94a3b8' }, input: { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)' } }}
                    />
                    <Button type="submit" loading={isLoading} fullWidth variant="gradient" gradient={{ from: 'blue', to: 'indigo' }}>
                      Kirim OTP
                    </Button>
                  </Stack>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <Stack gap="md">
                    <TextInput
                      label="Kode OTP"
                      placeholder="6 digit angka"
                      value={otp}
                      onChange={(e) => setOtp(e.currentTarget.value)}
                      maxLength={6}
                      styles={{ label: { color: '#94a3b8' }, input: { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)', letterSpacing: '2px', textAlign: 'center', fontSize: '18px' } }}
                    />
                    <Button type="submit" fullWidth variant="gradient" gradient={{ from: 'blue', to: 'indigo' }}>
                      Verifikasi OTP
                    </Button>
                  </Stack>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <Stack gap="md">
                    <PasswordInput
                      label="Password Baru"
                      placeholder="Minimal 8 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.currentTarget.value)}
                      leftSection={<IconLock size={16} />}
                      styles={{ label: { color: '#94a3b8' }, input: { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)' } }}
                    />
                    <PasswordInput
                      label="Konfirmasi Password"
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                      leftSection={<IconLock size={16} />}
                      styles={{ label: { color: '#94a3b8' }, input: { color: 'white', backgroundColor: 'rgba(255,255,255,0.05)' } }}
                    />
                    <Button type="submit" loading={isLoading} fullWidth variant="gradient" gradient={{ from: 'green', to: 'teal' }}>
                      Reset Password
                    </Button>
                  </Stack>
                </form>
              )}

              <Center mt="md">
                <Link to="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', color: '#94a3b8' }}>
                  <IconArrowLeft size={16} style={{ marginRight: 4 }} />
                  <Text size="sm">Kembali ke Login</Text>
                </Link>
              </Center>
            </Stack>
          </Paper>
        )}
      </Transition>
    </Box>
  );
}
