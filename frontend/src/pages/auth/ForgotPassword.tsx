import {
  Paper, Title, Text, Stack, Center, Box, Transition,
} from '@mantine/core';
import { IconKey, IconArrowLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
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
            <Stack gap="lg" align="center">
              <Box
                style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                }}
              >
                <IconKey size={32} color="white" stroke={1.5} />
              </Box>

              <Box ta="center">
                <Title order={3} c="white" fw={700}>Fitur Dalam Pengembangan</Title>
                <Text size="sm" c="dimmed" mt={8}>
                  Fitur lupa password sedang dalam tahap pengembangan dan akan segera tersedia.
                  Silakan hubungi administrator untuk mereset password Anda.
                </Text>
              </Box>

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
