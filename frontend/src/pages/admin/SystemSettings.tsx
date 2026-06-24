import { useState, useEffect } from 'react';
import {
  Box, Title, Paper, Group, TextInput, Button,
  Text, Stack, Divider, LoadingOverlay, Accordion
} from '@mantine/core';
import { IconDeviceFloppy, IconLock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../lib/axios';

export default function SystemSettings() {
  const [boardAccessCode, setBoardAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/settings/BOARD_ACCESS_CODE');
        setBoardAccessCode(res.data?.value || '');
      } catch (err: any) {
        if (err.response?.status !== 404) {
          notifications.show({ title: 'Error', message: 'Gagal mengambil pengaturan sistem', color: 'red' });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!boardAccessCode) {
      return notifications.show({ title: 'Peringatan', message: 'Kode akses tidak boleh kosong', color: 'yellow' });
    }

    setIsSaving(true);
    try {
      await api.put('/settings/BOARD_ACCESS_CODE', {
        value: boardAccessCode,
        description: 'Kode akses untuk halaman Kanban Publik'
      });
      notifications.show({ title: 'Sukses', message: 'Kode akses Kanban berhasil diperbarui', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: 'Gagal menyimpan pengaturan', color: 'red' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      <Title order={2} mb="xs">Pengaturan Sistem</Title>
      <Text c="dimmed" mb="lg">Kelola konfigurasi global aplikasi.</Text>

      <Paper p="md" radius="md" withBorder pos="relative">
        <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
        
        <Accordion variant="separated" defaultValue="kanban-security">
          <Accordion.Item value="kanban-security">
            <Accordion.Control icon={<IconLock size={20} color="#3b82f6" />}>
              <Box>
                <Title order={4}>Keamanan Kanban Publik</Title>
                <Text size="sm" c="dimmed" mt={4}>
                  Atur kode akses rahasia yang dibutuhkan pengguna untuk melihat Kanban Board secara publik.
                </Text>
              </Box>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap="lg" mt="md">
                <TextInput
                  label="Kode Akses Board"
                  placeholder="Contoh: TAS2026"
                  value={boardAccessCode}
                  onChange={(e) => setBoardAccessCode(e.currentTarget.value)}
                  w={{ base: '100%', sm: 300 }}
                />

                <Divider />

                <Group justify="flex-end">
                  <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={handleSave}
                    loading={isSaving}
                  >
                    Simpan Perubahan
                  </Button>
                </Group>
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>
    </Box>
  );
}
