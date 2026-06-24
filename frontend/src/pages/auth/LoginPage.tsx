import { useState } from 'react';
import {
  Paper, TextInput, PasswordInput, Button, Title, Text,
  Stack, Center, Box, Alert, Transition,
} from '@mantine/core';
import { IconUser, IconLock, IconAlertCircle, IconBuildingFactory2 } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Username dan password wajib diisi');
      return;
    }

    const success = await login(username, password);
    if (success) {
      const user = useAuthStore.getState().user;
      if (user?.role === 'teknisi') navigate('/teknisi');
      else if (user?.role === 'admin') navigate('/admin');
      else if (user?.role === 'superadmin') navigate('/superadmin');
    } else {
      setError('Username atau password salah');
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
      {/* Decorative floating shapes */}
      <Box
        style={{
          position: 'absolute', top: '10%', left: '5%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,139,230,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <Box
        style={{
          position: 'absolute', bottom: '15%', right: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

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
            <form onSubmit={handleSubmit}>
              <Stack gap="lg">
                {/* Logo & Title */}
                <Center>
                  <Box
                    style={{
                      width: 60, height: 60, borderRadius: 16,
                      background: 'linear-gradient(135deg, #228be6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(34, 139, 230, 0.3)',
                    }}
                  >
                    <IconBuildingFactory2 size={32} color="white" stroke={1.5} />
                  </Box>
                </Center>

                <Box ta="center">
                  <Title order={2} c="white" fw={700}>
                    Sistem Manajemen
                  </Title>
                  <Text size="sm" c="dimmed" mt={4}>
                    Dokumen Kerja & Inventaris
                  </Text>
                </Box>

                {/* Error Alert */}
                {error && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    variant="light"
                    radius="md"
                  >
                    {error}
                  </Alert>
                )}

                {/* Form Fields */}
                <TextInput
                  id="login-username"
                  label="Username"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.currentTarget.value)}
                  leftSection={<IconUser size={16} />}
                  size="md"
                  radius="md"
                  styles={{
                    label: { color: '#94a3b8', marginBottom: 6, fontSize: 13 },
                    input: {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      '&:focus': { borderColor: '#228be6' },
                    },
                  }}
                />

                <PasswordInput
                  id="login-password"
                  label="Password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  leftSection={<IconLock size={16} />}
                  size="md"
                  radius="md"
                  styles={{
                    label: { color: '#94a3b8', marginBottom: 6, fontSize: 13 },
                    input: {
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'white',
                    },
                  }}
                />

                <Button
                  id="login-submit"
                  type="submit"
                  fullWidth
                  size="md"
                  radius="md"
                  loading={isLoading}
                  gradient={{ from: '#228be6', to: '#6366f1', deg: 135 }}
                  variant="gradient"
                  mt="sm"
                  styles={{
                    root: {
                      height: 46,
                      fontWeight: 600,
                      fontSize: 15,
                      boxShadow: '0 4px 16px rgba(34,139,230,0.3)',
                    },
                  }}
                >
                  Masuk
                </Button>

                <Box ta="center">
                  <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                    <Text size="sm" c="#60a5fa" fw={500} style={{ '&:hover': { textDecoration: 'underline' } }}>
                      Lupa Password?
                    </Text>
                  </Link>
                </Box>

                {/* Link ke Board Publik */}
                <Link to="/board" style={{ textDecoration: 'none' }}>
                  <Paper
                    p="xs"
                    radius="md"
                    style={{
                      background: 'rgba(34,139,230,0.08)',
                      border: '1px solid rgba(34,139,230,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Text size="xs" c="#60a5fa" ta="center" fw={500}>
                      📋 Lihat Status Dokumen Pekerjaan (Tanpa Login)
                    </Text>
                  </Paper>
                </Link>
              </Stack>
            </form>
          </Paper>
        )}
      </Transition>
    </Box>
  );
}
