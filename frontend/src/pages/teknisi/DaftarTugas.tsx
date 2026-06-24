import {
  Box, Title, Text, Card, Group, Badge, Stack,
  TextInput, SegmentedControl, ThemeIcon, Loader, Center, ScrollArea
} from '@mantine/core';
import { IconSearch, IconChevronRight, IconFileText } from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';
import { useSocketConnection } from '../../hooks/useSocket';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proses: { label: 'Proses', color: 'yellow' },
  menunggu_izin: { label: 'Menunggu Izin', color: 'orange' },
  upload_diizinkan: { label: 'Upload Diizinkan', color: 'green' },
  draft_sn: { label: 'Draft SN', color: 'violet' },
  draft_pra: { label: 'Pra TTD', color: 'indigo' },
  assigned: { label: 'TTD', color: 'blue' },
  selesai: { label: 'Selesai', color: 'teal' },
};

export default function DaftarTugas() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('semua');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const socket = useSocketConnection();

  const fetchTasks = async () => {
    try {
      const res = await api.get('/documents/my-tasks');
      setTasks(res.data);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Listen for real-time document updates
  useEffect(() => {
    if (!socket) return;
    const handleDocumentUpdated = () => {
      fetchTasks();
    };
    const handleDocumentDeleted = () => {
      fetchTasks();
    };
    socket.on('document:updated', handleDocumentUpdated);
    socket.on('document:deleted', handleDocumentDeleted);
    return () => {
      socket.off('document:updated', handleDocumentUpdated);
      socket.off('document:deleted', handleDocumentDeleted);
    };
  }, [socket]);

  const filtered = tasks.filter((t) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.document_number.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'semua' || t.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <Box>
      <Title order={3} fw={700} mb="sm">Daftar Pekerjaan</Title>
      <Text size="sm" c="dimmed" mb="md">Daftar seluruh dokumen SP/SPMK di dalam sistem</Text>

      <TextInput
        placeholder="Cari dokumen..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        mb="sm"
        radius="md"
      />

      <ScrollArea type="never" offsetScrollbars mb="md">
        <SegmentedControl
          size="xs"
          value={filter}
          onChange={setFilter}
          data={[
            { value: 'semua', label: 'Semua' },
            { value: 'proses', label: 'Proses' },
            { value: 'upload_diizinkan', label: 'Upload' },
            { value: 'draft_sn', label: 'Draft SN' },
            { value: 'draft_pra', label: 'Pra TTD' },
            { value: 'assigned', label: 'TTD' },
            { value: 'selesai', label: 'Selesai' },
          ]}
          style={{ minWidth: 600 }}
        />
      </ScrollArea>

      {loading ? (
        <Center mt="xl"><Loader /></Center>
      ) : (
        <Stack gap="sm">
          {filtered.map((task) => (
            <Card
              key={task.id}
              padding="md"
              radius="md"
              shadow="sm"
              style={{ border: '1px solid #e9ecef', cursor: 'pointer', transition: 'transform .15s' }}
              onClick={() => navigate(`/teknisi/dokumen/${task.id}`)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <ThemeIcon variant="light" color={task.document_type === 'SP' ? 'blue' : 'grape'} size="lg" radius="md">
                    <IconFileText size={18} />
                  </ThemeIcon>
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Group gap={6} mb={2}>
                      <Badge size="xs" variant="outline" color="gray">{task.document_type}</Badge>
                      <Text size="xs" c="dimmed">{task.document_number}</Text>
                    </Group>
                    <Text size="sm" fw={600} truncate>{task.title}</Text>
                    <Text size="xs" c="dimmed">{dayjs(task.document_date).format('DD MMM YYYY')}</Text>
                    {task.deadline_sn && task.status !== 'assigned' && (
                      <Text size="xs" c="red" fw={500}>⚠️ Deadline: {dayjs(task.deadline_sn).format('DD MMM')}</Text>
                    )}
                    {task.assignees && task.assignees.length > 0 ? (
                      <Text size="xs" c="blue" mt={2}>👤 Ditugaskan: {task.assignees.map((a: any) => a.user.username).join(', ')}</Text>
                    ) : (
                      <Text size="xs" c="orange" mt={2}>Belum ada teknisi</Text>
                    )}
                  </Box>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Badge color={STATUS_CONFIG[task.status]?.color || 'gray'} variant="light" size="sm">
                    {STATUS_CONFIG[task.status]?.label || task.status}
                  </Badge>
                  <IconChevronRight size={16} color="#adb5bd" />
                </Group>
              </Group>
            </Card>
          ))}

          {filtered.length === 0 && (
            <Card p="xl" ta="center" radius="md">
              <Text c="dimmed">Tidak ada tugas yang cocok.</Text>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
}
