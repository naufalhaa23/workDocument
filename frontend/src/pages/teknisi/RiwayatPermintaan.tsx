import { useState, useEffect, useCallback } from 'react';
import {
  Box, Title, Text, Card, Group, Badge, Stack, ThemeIcon, Center, Loader, Button,
} from '@mantine/core';
import { IconArrowLeft, IconCheck, IconX, IconClock, IconRefresh } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useSocketConnection } from '../../hooks/useSocket';
import dayjs from 'dayjs';

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof IconCheck }> = {
  pending: { label: 'Menunggu', color: 'orange', icon: IconClock },
  approved: { label: 'Disetujui', color: 'green', icon: IconCheck },
  rejected: { label: 'Ditolak', color: 'red', icon: IconX },
};

export default function RiwayatPermintaan() {
  const navigate = useNavigate();
  const socket = useSocketConnection();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/inventory-requests/my');
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Real-time: refresh when admin approves/rejects
  useEffect(() => {
    if (!socket) return;
    const handleNotif = () => {
      fetchHistory();
    };
    socket.on('notification:new', handleNotif);
    return () => {
      socket.off('notification:new', handleNotif);
    };
  }, [socket, fetchHistory]);

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)} px={0}>
          Kembali
        </Button>
        <Button
          variant="subtle" size="xs" color="blue"
          leftSection={<IconRefresh size={14} />}
          onClick={() => { setLoading(true); fetchHistory(); }}
        >
          Refresh
        </Button>
      </Group>

      <Title order={3} fw={700} mb="xs">Riwayat Permintaan</Title>
      <Text size="sm" c="dimmed" mb="lg">Lacak status permintaan barang Anda</Text>

      {loading ? (
        <Center mt="xl"><Loader /></Center>
      ) : (
        <Stack gap="sm">
          {history.length === 0 ? (
            <Card p="xl" ta="center" radius="md" style={{ border: '1px dashed #ced4da' }}>
              <Text c="dimmed">Belum ada riwayat permintaan barang.</Text>
            </Card>
          ) : (
            history.map((req) => {
              const st = STATUS_MAP[req.status] || STATUS_MAP.pending;
              return (
                <Card key={req.id} padding="md" radius="md" shadow="sm" style={{ border: `1px solid ${req.status === 'approved' ? '#b2f2bb' : req.status === 'rejected' ? '#ffc9c9' : '#e9ecef'}` }}>
                  <Group justify="space-between" mb="xs">
                    <Group gap="sm">
                      <ThemeIcon variant="light" color={st.color} radius="md" size="lg">
                        <st.icon size={18} />
                      </ThemeIcon>
                      <Box>
                        <Text size="sm" fw={600}>{req.item?.name}</Text>
                        <Text size="xs" c="dimmed">{req.quantity} {req.item?.unit}</Text>
                      </Box>
                    </Group>
                    <Badge color={st.color} variant="light" size="sm">{st.label}</Badge>
                  </Group>
                  <Text size="xs" c="dimmed">Alasan: {req.reason}</Text>
                  <Text size="xs" c="dimmed">Diajukan: {dayjs(req.requested_at).format('DD MMM YYYY, HH:mm')}</Text>
                  {req.admin_notes && req.status === 'rejected' && (
                    <Text size="xs" c="red" fw={500} mt={4}>
                      💬 Catatan Admin: {req.admin_notes}
                    </Text>
                  )}
                  {req.admin_notes && req.status === 'approved' && (
                    <Text size="xs" c="green" fw={500} mt={4}>
                      ✅ {req.admin_notes}
                    </Text>
                  )}
                </Card>
              );
            })
          )}
        </Stack>
      )}
    </Box>
  );
}
