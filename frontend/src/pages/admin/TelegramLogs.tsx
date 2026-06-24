import { useState, useEffect } from 'react';
import {
  Box, Title, Paper, Group, Badge, Text, ActionIcon,
  Center, Loader, Tooltip
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconBrandTelegram, IconRefresh, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { color: string; icon: any }> = {
  SUCCESS: { color: 'green', icon: IconCheck },
  FAILED: { color: 'red', icon: IconX },
};

export default function TelegramLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  


  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/telegram/logs');
      setLogs(res.data);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat log Telegram', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Group>
          <IconBrandTelegram size={32} color="#229ED9" />
          <Title order={2} fw={700}>Riwayat Log Telegram</Title>
        </Group>
        <Tooltip label="Refresh Data">
          <ActionIcon onClick={fetchLogs} variant="light" color="blue" size="lg">
            <IconRefresh size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {loading && logs.length === 0 ? (
        <Center mt="xl"><Loader /></Center>
      ) : (
        <Paper radius="md" shadow="sm" style={{ border: '1px solid #e9ecef', overflow: 'hidden' }}>
          <DataTable
            withTableBorder={false}
            borderRadius="md"
            striped
            highlightOnHover
            minHeight={200}
            scrollAreaProps={{ type: 'always', offsetScrollbars: true }}
            records={logs}
            columns={[
              {
                accessor: 'created_at', title: 'Waktu', width: 150,
                render: (r) => <Text size="sm">{dayjs(r.created_at).format('DD MMM YYYY HH:mm')}</Text>
              },
              {
                accessor: 'user', title: 'Penerima', width: 140,
                render: (r) => (
                  <Box>
                    <Text size="sm" fw={600}>{r.user?.username || 'System/Guest'}</Text>
                    <Text size="xs" c="dimmed">{r.telegram_chat_id}</Text>
                  </Box>
                )
              },
              {
                accessor: 'message', title: 'Pesan',
                render: (r) => (
                  <Text size="sm" lineClamp={2} title={r.message}>
                    {r.message}
                  </Text>
                )
              },
              {
                accessor: 'status', title: 'Status', width: 120, textAlign: 'center',
                render: (r) => {
                  const config = STATUS_CONFIG[r.status] || { color: 'gray', icon: IconClock };
                  const Icon = config.icon;
                  return (
                    <Badge color={config.color} variant="light" size="sm" leftSection={<Icon size={12} />}>
                      {r.status}
                    </Badge>
                  );
                }
              },
              {
                accessor: 'error_detail', title: 'Detail Error', width: 200,
                render: (r) => (
                  <Text size="xs" c="red" lineClamp={2} title={r.error_detail}>
                    {r.error_detail || '-'}
                  </Text>
                )
              }
            ]}
          />
          <Group justify="center" p="md">
            <Text size="sm" c="dimmed">Menampilkan log terbaru (maks 100)</Text>
          </Group>
        </Paper>
      )}
    </Box>
  );
}
