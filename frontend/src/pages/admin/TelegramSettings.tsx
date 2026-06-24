import { useState, useEffect } from 'react';
import {
  Box, Title, Paper, Group, Stack, TextInput, Switch,
  Button, Text, Divider, Alert,
} from '@mantine/core';
import { IconBrandTelegram, IconInfoCircle, IconDeviceFloppy } from '@tabler/icons-react';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';

export default function TelegramSettings() {
  const [enabled, setEnabled] = useState(true);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Test Message States
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Halo! Ini adalah pesan tes dari Sistem Manajemen Dokumen.');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/telegram/settings');
      setEnabled(res.data.enabled);
      setToken(res.data.token);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat pengaturan Telegram', color: 'red' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/telegram/settings', { enabled, token });
      notifications.show({ title: 'Sukses', message: 'Pengaturan berhasil disimpan', color: 'green' });
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal menyimpan pengaturan', color: 'red' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!testChatId) return notifications.show({ title: 'Peringatan', message: 'Chat ID tujuan wajib diisi', color: 'orange' });
    
    setIsTesting(true);
    try {
      const res = await api.post('/telegram/test', { target_chat_id: testChatId, message: testMessage });
      notifications.show({ title: 'Terkirim', message: res.data.message, color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Gagal', message: err.response?.data?.message || 'Gagal mengirim pesan', color: 'red' });
    } finally {
      setIsTesting(false);
    }
  };

  const [isTriggering, setIsTriggering] = useState(false);
  const handleTriggerCron = async () => {
    setIsTriggering(true);
    try {
      const res = await api.post('/telegram/trigger-cron');
      notifications.show({ title: 'Selesai', message: res.data.message, color: 'blue' });
    } catch (err: any) {
      notifications.show({ title: 'Gagal', message: err.response?.data?.message || 'Gagal memicu cron deadline', color: 'red' });
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Box>
      <Group mb="lg">
        <IconBrandTelegram size={32} color="#229ED9" />
        <Title order={2} fw={700}>Pengaturan Telegram</Title>
      </Group>

      <Paper p="xl" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef', maxWidth: 800 }}>
        <Stack gap="lg">
          <Alert icon={<IconInfoCircle size={16} />} title="Informasi Integrasi" color="blue">
            Sistem ini menggunakan Bot Telegram untuk mengirim pesan. Pastikan Anda telah membuat bot melalui BotFather di Telegram.
          </Alert>

          <Group justify="space-between" align="center">
            <Box>
              <Text fw={600} size="lg">Aktifkan Notifikasi Telegram</Text>
              <Text size="sm" c="dimmed">Jika dimatikan, sistem tidak akan mengirim pesan Telegram apapun (termasuk cron deadline).</Text>
            </Box>
            <Switch
              size="lg"
              color="blue"
              checked={enabled}
              onChange={(event) => setEnabled(event.currentTarget.checked)}
            />
          </Group>

          <Divider />

          <TextInput
            label="Telegram Bot Token"
            description="Token dapat ditemukan di BotFather."
            placeholder="Masukkan token..."
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
            disabled={!enabled}
            size="md"
          />

          <Button
            leftSection={<IconDeviceFloppy size={18} />}
            onClick={handleSave}
            loading={isSaving || isLoading}
            mt="md"
            w={200}
            color="blue"
          >
            Simpan Pengaturan
          </Button>

          <Divider my="md" label="Kirim Pesan Tes" labelPosition="center" />

          <Paper p="md" bg="gray.0" radius="md">
            <Stack gap="md">
              <TextInput
                label="Chat ID Tujuan"
                placeholder="Contoh: 123456789"
                value={testChatId}
                onChange={(e) => setTestChatId(e.currentTarget.value)}
                disabled={!enabled}
              />
              <TextInput
                label="Pesan"
                value={testMessage}
                onChange={(e) => setTestMessage(e.currentTarget.value)}
                disabled={!enabled}
              />
              <Button onClick={handleTestMessage} loading={isTesting} disabled={!enabled} color="blue">
                Kirim Tes
              </Button>
            </Stack>
          </Paper>

          <Divider my="md" label="Peralatan Developer" labelPosition="center" />

          <Group justify="center">
            <Button
              variant="light"
              color="orange"
              onClick={handleTriggerCron}
              loading={isTriggering}
              disabled={!enabled}
            >
              Jalankan Pengecekan Deadline (Manual Cron)
            </Button>
          </Group>

        </Stack>
      </Paper>
    </Box>
  );
}
