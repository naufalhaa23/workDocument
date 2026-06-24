import { useState, useEffect } from 'react';
import {
  Box, Title, Text, Card, Group, Badge, Stack, Button,
  SegmentedControl, ThemeIcon, Center, Loader, ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft, IconCheck, IconX, IconUpload,
  IconPackage, IconAlertTriangle, IconBell, IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { modals } from '@mantine/modals';
import { api } from '../../lib/axios';
import { useSocketConnection } from '../../hooks/useSocket';
import dayjs from 'dayjs';

const TYPE_CONFIG: Record<string, { icon: typeof IconCheck; color: string }> = {
  upload_approved: { icon: IconCheck, color: 'green' },
  upload_rejected: { icon: IconX, color: 'red' },
  deadline_warning: { icon: IconAlertTriangle, color: 'orange' },
  inventory_approved: { icon: IconCheck, color: 'green' },
  inventory_rejected: { icon: IconX, color: 'red' },
  upload_request: { icon: IconUpload, color: 'blue' },
  inventory_request: { icon: IconPackage, color: 'orange' },
  system: { icon: IconBell, color: 'blue' },
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const socket = useSocketConnection();
  const [filter, setFilter] = useState('semua');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Live refresh when a new notification arrives while this page is open
  useEffect(() => {
    if (!socket) return;
    const onNew = () => fetchNotifications();
    socket.on('notification:new', onNew);
    return () => { socket.off('notification:new', onNew); };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchNotifications();
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotif = async (id: number) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new Event('notifications-updated'));
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = () => {
    modals.openConfirmModal({
      title: 'Hapus Semua Notifikasi',
      centered: true,
      children: <Text size="sm">Yakin ingin menghapus semua notifikasi? Tindakan ini tidak dapat dibatalkan.</Text>,
      labels: { confirm: 'Hapus Semua', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete('/notifications');
          setNotifications([]);
          window.dispatchEvent(new Event('notifications-updated'));
        } catch (err) {
          console.error(err);
        }
      },
    });
  };

  const filtered = filter === 'belum'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const today = dayjs().startOf('day');
  const yesterday = dayjs().subtract(1, 'day').startOf('day');

  const getGroup = (dateStr: string) => {
    const d = dayjs(dateStr);
    if (d.isAfter(today)) return 'today';
    if (d.isAfter(yesterday)) return 'yesterday';
    return 'older';
  };

  const groupedNotifs = filtered.reduce((acc, n) => {
    const group = getGroup(n.created_at);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {} as Record<string, any[]>);

  const renderCard = (notif: any) => {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
    return (
      <Card key={notif.id} padding="md" radius="md" shadow="xs"
        style={{ border: `1px solid ${notif.is_read ? '#e9ecef' : '#d0ebff'}`, background: notif.is_read ? 'white' : '#f0f7ff', cursor: 'pointer' }}
        onClick={() => !notif.is_read && markAsRead(notif.id)}
      >
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ThemeIcon variant="light" color={cfg.color} radius="xl" size="lg">
            <cfg.icon size={18} />
          </ThemeIcon>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Group gap={6} mb={2}>
              <Text size="sm" fw={600}>{notif.title}</Text>
              {!notif.is_read && <Badge size="xs" color="blue" variant="filled" circle>●</Badge>}
            </Group>
            <Text size="sm" c="dimmed">{notif.message}</Text>
            <Text size="xs" c="dimmed" mt={4}>{dayjs(notif.created_at).format('DD MMM YYYY, HH:mm')}</Text>
          </Box>
          <ActionIcon
            variant="subtle" color="red" size="sm"
            onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id); }}
            aria-label="Hapus notifikasi"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Card>
    );
  };

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  return (
    <Box>
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)} mb="md" px={0}>
        Kembali
      </Button>

      <Group justify="space-between" mb="md">
        <Title order={3} fw={700}>Notifikasi</Title>
        <Group gap="xs">
          <Button variant="subtle" size="xs" color="blue" onClick={markAllAsRead}>Tandai Semua Dibaca</Button>
          {notifications.length > 0 && (
            <Button variant="subtle" size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={clearAll}>
              Hapus Semua
            </Button>
          )}
        </Group>
      </Group>

      <SegmentedControl
        fullWidth size="sm" mb="lg"
        value={filter} onChange={setFilter}
        data={[
          { value: 'semua', label: 'Semua' },
          { value: 'belum', label: `Belum Dibaca (${notifications.filter((n) => !n.is_read).length})` },
        ]}
      />

      {groupedNotifs['today'] && (
        <>
          <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">Hari Ini</Text>
          <Stack gap="sm" mb="lg">
            {groupedNotifs['today'].map(renderCard)}
          </Stack>
        </>
      )}

      {groupedNotifs['yesterday'] && (
        <>
          <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">Kemarin</Text>
          <Stack gap="sm" mb="lg">
            {groupedNotifs['yesterday'].map(renderCard)}
          </Stack>
        </>
      )}

      {groupedNotifs['older'] && (
        <>
          <Text size="xs" fw={600} c="dimmed" mb="xs" tt="uppercase">Sebelumnya</Text>
          <Stack gap="sm">
            {groupedNotifs['older'].map(renderCard)}
          </Stack>
        </>
      )}

      {notifications.length === 0 && (
        <Card p="xl" ta="center" radius="md" style={{ border: '1px dashed #ced4da' }}>
          <Text c="dimmed">Tidak ada notifikasi.</Text>
        </Card>
      )}
    </Box>
  );
}
