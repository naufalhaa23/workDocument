import { useState, useEffect } from 'react';
import {
  Box, Title, Text, Paper, Group, Avatar, Stack,
  TextInput, PasswordInput, Button, Divider, Badge,
} from '@mantine/core';
import { IconUser, IconMail, IconLock, IconShield } from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { notifications } from '@mantine/notifications';
import { api } from '../../lib/axios';
import { IconBrandTelegram } from '@tabler/icons-react';

export default function ProfilPage() {
  const { user } = useAuthStore();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  
  const [profileData, setProfileData] = useState<any>(user);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api.get('/auth/me').then(res => {
        const currentUser = res.data;
        if (currentUser) {
          setProfileData(currentUser);
          if (currentUser.telegram_chat_id) {
            setPhoneNumber(currentUser.telegram_chat_id);
          }
        }
      });
    }
  }, [user?.id]);

  const handleUpdatePhone = async () => {
    if (!phoneNumber) return;
    setIsUpdatingPhone(true);
    try {
      await api.put(`/users/${user?.id}/telegram`, { telegram_chat_id: phoneNumber });
      notifications.show({ title: 'Berhasil', message: 'Telegram Chat ID berhasil diperbarui', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memperbarui Telegram Chat ID', color: 'red' });
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const handleChangePw = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      notifications.show({ title: 'Error', message: 'Semua field wajib diisi', color: 'red' });
      return;
    }
    if (newPw !== confirmPw) {
      notifications.show({ title: 'Error', message: 'Password baru tidak cocok', color: 'red' });
      return;
    }
    if (newPw.length < 8) {
      notifications.show({ title: 'Error', message: 'Password minimal 8 karakter', color: 'red' });
      return;
    }

    setIsChangingPw(true);
    try {
      await api.put(`/users/${user?.id}/password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      });
      notifications.show({ title: 'Berhasil', message: 'Password berhasil diubah', color: 'green' });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengubah password';
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    } finally {
      setIsChangingPw(false);
    }
  };

  return (
    <Box>
      <Title order={3} fw={700} mb="lg">Profil Saya</Title>

      {/* Profile Card */}
      <Paper p="xl" radius="lg" shadow="sm" mb="lg" style={{ border: '1px solid #e9ecef' }}>
        <Group justify="center" mb="md">
          <Avatar size={80} radius="xl" color="blue" style={{ fontSize: 32 }}>
            {profileData?.username?.charAt(0).toUpperCase()}
          </Avatar>
        </Group>
        <Text ta="center" fw={700} size="lg">{profileData?.username}</Text>
        <Text ta="center" size="sm" c="dimmed" mb="sm">{profileData?.email}</Text>
        <Group justify="center">
          <Badge leftSection={<IconShield size={12} />} variant="light" color="blue" size="lg" tt="capitalize">
            {profileData?.role}
          </Badge>
        </Group>

        <Divider my="lg" />

        <Stack gap="sm">
          <Group gap="xs">
            <IconUser size={16} color="#868e96" />
            <Text size="sm" c="dimmed">Username:</Text>
            <Text size="sm" fw={500}>{profileData?.username}</Text>
          </Group>
          <Group gap="xs">
            <IconMail size={16} color="#868e96" />
            <Text size="sm" c="dimmed">Email:</Text>
            <Text size="sm" fw={500}>{profileData?.email}</Text>
          </Group>
          <Group gap="xs">
            <IconShield size={16} color="#868e96" />
            <Text size="sm" c="dimmed">Role:</Text>
            <Text size="sm" fw={500} tt="capitalize">{profileData?.role}</Text>
          </Group>
        </Stack>
      </Paper>

      {user?.role !== 'teknisi' && (
        <Paper p="lg" radius="lg" shadow="sm" mb="lg" style={{ border: '1px solid #e9ecef' }}>
          <Group gap="xs" mb="md">
            <IconBrandTelegram size={20} color="#229ED9" />
            <Title order={5} fw={600}>Pengaturan Telegram</Title>
          </Group>

          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Sistem akan mengirimkan pengingat deadline ke Telegram Anda.<br/>
              Untuk mendapatkan Chat ID, kirim pesan apa saja ke Bot resmi kami di aplikasi Telegram Anda.
            </Text>
            <Group align="flex-end">
              <TextInput
                label="Telegram Chat ID"
                placeholder="Contoh: 123456789"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button onClick={handleUpdatePhone} loading={isUpdatingPhone} color="blue">
                Simpan Chat ID
              </Button>
            </Group>
          </Stack>
        </Paper>
      )}

      {/* Change Password */}
      <Paper p="lg" radius="lg" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <Group gap="xs" mb="md">
          <IconLock size={20} />
          <Title order={5} fw={600}>Ubah Password</Title>
        </Group>

        <Stack gap="md">
          <PasswordInput
            label="Password Saat Ini"
            placeholder="Masukkan password lama"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.currentTarget.value)}
          />
          <PasswordInput
            label="Password Baru"
            placeholder="Minimal 8 karakter"
            value={newPw}
            onChange={(e) => setNewPw(e.currentTarget.value)}
          />
          <PasswordInput
            label="Konfirmasi Password Baru"
            placeholder="Ulangi password baru"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.currentTarget.value)}
          />
          <Button onClick={handleChangePw} loading={isChangingPw} radius="md">
            💾 Simpan Password
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
