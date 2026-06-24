import { useState, useEffect } from 'react';
import {
  SimpleGrid, Paper, Text, Group, ThemeIcon, Title, Box,
  Stack, Badge, Timeline, Progress, Loader, Center,
} from '@mantine/core';
import {
  IconFileText, IconClockHour4, IconChecks, IconAlertTriangle,
  IconUserPlus, IconUpload, IconFileCheck, IconPackage, IconActivity,
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/axios';
import { useSocketConnection } from '../../hooks/useSocket';
import dayjs from 'dayjs';

const getActionIcon = (action: string) => {
  if (action.includes('upload')) return IconUpload;
  if (action.includes('approve') || action.includes('izin')) return IconFileCheck;
  if (action.includes('inventory') || action.includes('barang')) return IconPackage;
  if (action.includes('login')) return IconUserPlus;
  if (action.includes('create') || action.includes('dokumen')) return IconFileText;
  return IconActivity;
};

const getActionColor = (action: string) => {
  if (action.includes('approve')) return 'green';
  if (action.includes('upload')) return 'violet';
  if (action.includes('izin') || action.includes('inventory')) return 'orange';
  if (action.includes('login')) return 'gray';
  return 'blue';
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const socket = useSocketConnection();

  const [activities, setActivities] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [actRes, docRes] = await Promise.all([
          api.get('/activity-logs', { params: { limit: 10 } }),
          api.get('/documents', { params: { limit: 1000 } })
        ]);
        setActivities(actRes.data.data);
        setDocuments(docRes.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Listen for real-time activity updates
  useEffect(() => {
    if (!socket) return;
    const handleNewActivity = (data: any) => {
      // Unshift to the top of the list and keep only 10
      setActivities((prev) => [
        {
          id: Date.now(),
          action: data.action,
          description: data.description,
          created_at: data.created_at,
          user: { username: data.user },
        },
        ...prev,
      ].slice(0, 10));
    };

    socket.on('activity:new', handleNewActivity);
    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket]);

  if (loading) {
    return <Center h={400}><Loader size="xl" /></Center>;
  }

  // Calculate KPIs
  const totalDokumen = documents.length;
  const menungguPersetujuan = documents.filter(d => d.status === 'menunggu_izin').length;
  const selesai = documents.filter(d => d.status === 'assigned' || d.status === 'upload_diizinkan').length;
  
  // Calculate deadlines (< 10 days)
  const today = dayjs();
  const deadlines = documents
    .filter(d => d.deadline_sn && d.status !== 'assigned' && dayjs(d.deadline_sn).diff(today, 'day') <= 10)
    .map(d => ({
      doc: d.document_number,
      title: d.title,
      daysLeft: dayjs(d.deadline_sn).diff(today, 'day'),
      teknisi: d.assignees?.length > 0 ? d.assignees.map((a: any) => a.user.username).join(', ') : '-',
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const KPI_CARDS = [
    { label: 'Total Dokumen', value: totalDokumen.toString(), icon: IconFileText, color: 'blue', change: 'Total di sistem' },
    { label: 'Menunggu Izin Upload', value: menungguPersetujuan.toString(), icon: IconClockHour4, color: 'orange', change: 'Perlu review' },
    { label: 'Selesai / Terjadwal', value: selesai.toString(), icon: IconChecks, color: 'green', change: 'Tugas aktif' },
    { label: 'Deadline Mepet', value: deadlines.length.toString(), icon: IconAlertTriangle, color: 'red', change: '< 10 hari lagi' },
  ];

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Box>
          <Title order={2} fw={700} c="#1a1b2e">Dashboard</Title>
          <Text size="sm" c="dimmed">Selamat datang kembali, {user?.username}! 👋</Text>
        </Box>
        <Badge variant="light" color="blue" size="lg" radius="md">
          {dayjs().locale('id').format('dddd, DD MMMM YYYY')}
        </Badge>
      </Group>

      {/* KPI Cards */}
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} mb="xl">
        {KPI_CARDS.map((kpi) => (
          <Paper key={kpi.label} p="lg" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed" fw={500}>{kpi.label}</Text>
              <ThemeIcon variant="light" color={kpi.color} size="lg" radius="md">
                <kpi.icon size={20} stroke={1.5} />
              </ThemeIcon>
            </Group>
            <Text fw={700} size="xl" lh={1}>{kpi.value}</Text>
            <Text size="xs" c="dimmed" mt={6}>{kpi.change}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Left: Deadline Alerts */}
        <Paper p="lg" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconAlertTriangle size={20} color="#e03131" />
              <Title order={4} fw={600}>Deadline Mendekati</Title>
            </Group>
            <Badge color="red" variant="light">{deadlines.length}</Badge>
          </Group>

          {deadlines.length === 0 ? (
            <Text ta="center" c="dimmed" mt="xl">Tidak ada deadline mepet 🎉</Text>
          ) : (
            <Stack gap="sm">
              {deadlines.map((d) => (
                <Paper
                  key={d.doc} p="sm" radius="md"
                  style={{ background: d.daysLeft <= 1 ? '#fff5f5' : '#fffbeb', border: `1px solid ${d.daysLeft <= 1 ? '#ffc9c9' : '#ffd8a8'}` }}
                >
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={600}>{d.doc}</Text>
                    <Badge color={d.daysLeft <= 1 ? 'red' : 'orange'} variant="filled" size="sm">
                      {d.daysLeft === 0 ? 'Hari ini' : `${d.daysLeft} hari lagi`}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">{d.title}</Text>
                  <Text size="xs" c="dimmed">Teknisi: {d.teknisi}</Text>
                  <Progress value={100 - (d.daysLeft * 20)} color={d.daysLeft <= 1 ? 'red' : 'orange'} size="xs" mt={6} radius="xl" />
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Right: Activity Log */}
        <Paper p="lg" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
          <Group justify="space-between" mb="md">
            <Title order={4} fw={600}>📋 Activity Log</Title>
            <Badge color="blue" variant="outline" className="animate-pulse">Live</Badge>
          </Group>

          {activities.length === 0 ? (
            <Text ta="center" c="dimmed">Belum ada aktivitas.</Text>
          ) : (
            <Timeline active={activities.length} bulletSize={28} lineWidth={2}>
              {activities.map((act) => {
                const Icon = getActionIcon(act.action);
                const color = getActionColor(act.action);
                return (
                  <Timeline.Item
                    key={act.id}
                    bullet={
                      <ThemeIcon size={28} radius="xl" color={color} variant="light">
                        <Icon size={14} />
                      </ThemeIcon>
                    }
                    title={
                      <Group gap={6}>
                        <Text size="sm" fw={500} tt="capitalize">{act.user?.username || 'System'}</Text>
                        <Text size="xs" c="dimmed">— {act.action}</Text>
                      </Group>
                    }
                  >
                    <Text size="xs" c="dimmed">{act.description}</Text>
                    <Text size="xs" c="dimmed" mt={2}>{dayjs(act.created_at).format('DD MMM, HH:mm')} WIB</Text>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          )}
        </Paper>
      </SimpleGrid>
    </Box>
  );
}
