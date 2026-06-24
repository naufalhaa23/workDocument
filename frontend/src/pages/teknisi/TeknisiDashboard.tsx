import { useState, useEffect } from 'react';
import {
  SimpleGrid, Paper, Text, Group, Title, Box, Stack,
  Badge, Card, ThemeIcon, RingProgress, Center, Loader,
} from '@mantine/core';
import {
  IconFileText, IconPackage, IconChevronRight,
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useSocketConnection } from '../../hooks/useSocket';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proses: { label: 'Proses', color: 'yellow' },
  menunggu_izin: { label: 'Menunggu Izin', color: 'orange' },
  upload_diizinkan: { label: 'Upload Diizinkan', color: 'green' },
  draft_sn: { label: 'Draft SN', color: 'violet' },
  assigned: { label: 'Assigned', color: 'blue' },
};

export default function TeknisiDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const socket = useSocketConnection();
  const [tasks, setTasks] = useState<any[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [docsRes, invRes] = await Promise.all([
        api.get('/documents/my-tasks'),
        api.get('/inventory-requests/my')
      ]);
      setTasks(docsRes.data);
      setInventoryRequests(invRes.data.filter((r: any) => r.status === 'pending'));
    } catch (err) {
      console.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;
    const handleDocumentUpdated = () => {
      fetchDashboardData();
    };
    const handleDocumentDeleted = () => {
      fetchDashboardData();
    };
    socket.on('document:updated', handleDocumentUpdated);
    socket.on('document:deleted', handleDocumentDeleted);
    return () => {
      socket.off('document:updated', handleDocumentUpdated);
      socket.off('document:deleted', handleDocumentDeleted);
    };
  }, [socket]);

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  const aktif = tasks.filter(t => ['proses', 'upload_diizinkan'].includes(t.status)).length;
  const pending = tasks.filter(t => t.status === 'menunggu_izin').length;
  const selesai = tasks.filter(t => ['assigned', 'selesai', 'draft_sn'].includes(t.status)).length;
  
  const total = tasks.length || 1; // prevent division by zero
  const progressValue = Math.round((selesai / total) * 100);

  const RECENT_TASKS = tasks.slice(0, 3); // Get top 3 latest tasks

  return (
    <Box>
      {/* Greeting */}
      <Box mb="xl">
        <Title order={3} fw={700} c="#1a1b2e">
          {(() => {
            const h = new Date().getHours();
            if (h < 12) return `Selamat Pagi, ${user?.username}! 👋`;
            if (h < 15) return `Selamat Siang, ${user?.username}! 👋`;
            if (h < 18) return `Selamat Sore, ${user?.username}! 👋`;
            return `Selamat Malam, ${user?.username}! 👋`;
          })()}
        </Title>
        <Text size="sm" c="dimmed">
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </Text>
      </Box>

      {/* Summary Cards */}
      <SimpleGrid cols={2} mb="xl" spacing="sm">
        <Paper
          p="md" radius="lg" shadow="sm"
          style={{
            border: '1px solid #e9ecef',
            background: 'linear-gradient(135deg, #e7f5ff 0%, #d0ebff 100%)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/teknisi/dokumen')}
        >
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="white" color="blue" size="lg" radius="md">
              <IconFileText size={20} />
            </ThemeIcon>
            <IconChevronRight size={16} color="#339af0" />
          </Group>
          <Text size="xl" fw={800} c="#1864ab">{aktif}</Text>
          <Text size="xs" fw={500} c="#1c7ed6">Tugas Aktif</Text>
        </Paper>

        <Paper
          p="md" radius="lg" shadow="sm"
          style={{
            border: '1px solid #e9ecef',
            background: 'linear-gradient(135deg, #fff3bf 0%, #ffec99 100%)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/teknisi/inventaris')}
        >
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="white" color="orange" size="lg" radius="md">
              <IconPackage size={20} />
            </ThemeIcon>
            <IconChevronRight size={16} color="#e67700" />
          </Group>
          <Text size="xl" fw={800} c="#e67700">{inventoryRequests.length}</Text>
          <Text size="xs" fw={500} c="#f08c00">Permintaan Barang</Text>
        </Paper>
      </SimpleGrid>

      {/* Task Progress Ring */}
      <Paper p="lg" radius="lg" shadow="sm" mb="xl" style={{ border: '1px solid #e9ecef' }}>
        <Group justify="space-between" mb="sm">
          <Title order={5} fw={600}>Progress Tugas</Title>
          <Badge variant="light" color="blue">Semua</Badge>
        </Group>
        <Center>
          <RingProgress
            size={140}
            thickness={14}
            roundCaps
            sections={[
              { value: (aktif / total) * 100, color: '#228be6' },
              { value: (pending / total) * 100, color: '#fab005' },
              { value: (selesai / total) * 100, color: '#40c057' },
            ]}
            label={
              <Center>
                <Box ta="center">
                  <Text fw={800} size="xl" lh={1}>{progressValue}%</Text>
                  <Text size="xs" c="dimmed">Selesai</Text>
                </Box>
              </Center>
            }
          />
        </Center>
        <SimpleGrid cols={3} mt="md">
          <Box ta="center">
            <Text fw={700} c="blue">{aktif}</Text>
            <Text size="xs" c="dimmed">Aktif</Text>
          </Box>
          <Box ta="center">
            <Text fw={700} c="yellow">{pending}</Text>
            <Text size="xs" c="dimmed">Pending</Text>
          </Box>
          <Box ta="center">
            <Text fw={700} c="green">{selesai}</Text>
            <Text size="xs" c="dimmed">Selesai</Text>
          </Box>
        </SimpleGrid>
      </Paper>

      {/* Recent Tasks */}
      <Group justify="space-between" mb="sm">
        <Title order={5} fw={600}>Tugas Terbaru</Title>
        <Text
          size="xs" c="blue" fw={500}
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/teknisi/dokumen')}
        >
          Lihat Semua →
        </Text>
      </Group>
      <Stack gap="sm">
        {RECENT_TASKS.length === 0 ? (
          <Text ta="center" c="dimmed" size="sm">Belum ada tugas yang diassign ke Anda.</Text>
        ) : (
          RECENT_TASKS.map((task) => (
            <Card
              key={task.id}
              padding="md"
              radius="md"
              shadow="sm"
              style={{
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'transform .15s',
              }}
              onClick={() => navigate(`/teknisi/dokumen/${task.id}`)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
            >
              <Group justify="space-between">
                <Box>
                  <Group gap={6} mb={4}>
                    <Badge size="xs" variant="outline" color="gray">{task.document_type}</Badge>
                    <Text size="xs" c="dimmed">{task.document_number}</Text>
                  </Group>
                  <Text size="sm" fw={600}>{task.title}</Text>
                </Box>
                <Group gap="xs">
                  <Badge
                    color={STATUS_CONFIG[task.status]?.color || 'gray'}
                    variant="light"
                    size="sm"
                  >
                    {STATUS_CONFIG[task.status]?.label || task.status}
                  </Badge>
                  <IconChevronRight size={16} color="#adb5bd" />
                </Group>
              </Group>
            </Card>
          ))
        )}
      </Stack>
    </Box>
  );
}
