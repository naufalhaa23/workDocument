import {
  Box, Title, Text, Paper, Group, Badge, Button, Stack,
  ThemeIcon, Timeline, Card, Center, Loader, ActionIcon,
} from '@mantine/core';
import {
  IconArrowLeft, IconUpload, IconClock, IconCheck,
  IconCalendar, IconUser, IconFile, IconDownload,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import { getFileExt, isSnFile, getFileUrl } from '../../lib/fileUtils';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proses: { label: 'Proses', color: 'yellow' },
  menunggu_izin: { label: 'Menunggu Izin', color: 'orange' },
  upload_diizinkan: { label: 'Upload Diizinkan', color: 'green' },
  draft_sn: { label: 'Draft SN', color: 'violet' },
  assigned: { label: 'Assigned', color: 'blue' },
};

import { useSocketConnection } from '../../hooks/useSocket';

export default function DetailTugas() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const socket = useSocketConnection();

  const fetchTask = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      setTask(res.data);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat detail tugas', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  // Real-time synchronization
  // NOTE: notification:new toast is handled globally in App.tsx — do NOT listen here to avoid duplicates
  useEffect(() => {
    if (!socket) return;
    const handleDocumentUpdated = () => {
      fetchTask(); // Refresh live status
    };
    const handleDocumentDeleted = (data: any) => {
      if (Number(data.documentId) === Number(id)) {
        notifications.show({ title: 'Perhatian', message: 'Dokumen ini telah dihapus oleh Admin', color: 'red' });
        navigate('/teknisi/dokumen');
      }
    };
    socket.on('document:updated', handleDocumentUpdated);
    socket.on('document:deleted', handleDocumentDeleted);
    return () => {
      socket.off('document:updated', handleDocumentUpdated);
      socket.off('document:deleted', handleDocumentDeleted);
    };
  }, [socket, id, navigate]);

  const handleMintaIzin = async () => {
    setRequesting(true);
    try {
      await api.post('/uploads/request-permission', { document_id: id });
      notifications.show({ title: 'Sukses', message: 'Permintaan upload terkirim ke Admin', color: 'green' });
      fetchTask();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal minta izin', color: 'red' });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  if (!task) {
    return <Text ta="center" c="dimmed">Dokumen tidak ditemukan.</Text>;
  }

  const canRequestUpload = task.status === 'proses' || task.status === 'draft_sn';
  const canUpload = task.status === 'upload_diizinkan';
  const canUploadSigned = task.status === 'draft_pra';

  return (
    <Box>
      {/* Back button */}
      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(-1)}
        mb="md"
        px={0}
      >
        Kembali
      </Button>

      {/* Header Card */}
      <Paper p="lg" radius="lg" shadow="sm" mb="md" style={{ border: '1px solid #e9ecef' }}>
        <Group justify="space-between" mb="sm">
          <Group gap={6}>
            <Badge variant="outline" color={task.document_type === 'SP' ? 'blue' : 'grape'} size="sm">{task.document_type}</Badge>
            <Text size="sm" fw={600} c="dimmed">{task.document_number}</Text>
          </Group>
          <Badge color={STATUS_CONFIG[task.status]?.color || 'gray'} variant="light" size="lg">
            {STATUS_CONFIG[task.status]?.label || task.status}
          </Badge>
        </Group>

        <Title order={4} fw={700} mb="md">{task.title}</Title>

        <Stack gap="xs">
          <Group gap="xs">
            <IconCalendar size={14} color="#868e96" />
            <Text size="sm" c="dimmed">Tanggal: {task.document_date ? dayjs(task.document_date).format('DD MMMM YYYY') : '-'}</Text>
          </Group>
          <Group gap="xs">
            <IconUser size={14} color="#868e96" />
            <Text size="sm" c="dimmed">Dibuat oleh: {task.createdBy?.username}</Text>
          </Group>
          {task.deadline_sn && (
            <Group gap="xs">
              <IconClock size={14} color="#e03131" />
              <Text size="sm" c="red" fw={500}>Deadline SN: {dayjs(task.deadline_sn).format('DD MMMM YYYY')}</Text>
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Main Action Button */}
      {canRequestUpload && (
        <Button
          fullWidth
          size="lg"
          radius="md"
          color="orange"
          leftSection={<IconUpload size={20} />}
          mb="md"
          loading={requesting}
          onClick={handleMintaIzin}
          styles={{ root: { height: 56, fontSize: 16, fontWeight: 600 } }}
        >
          📤 Minta Izin Upload
        </Button>
      )}

      {task.status === 'menunggu_izin' && (
        <Paper p="md" radius="md" bg="orange.0" mb="md" style={{ border: '1px solid #ffd8a8' }}>
          <Group gap="xs">
            <IconClock size={18} color="#e67700" />
            <Text size="sm" fw={500} c="orange.8">Menunggu persetujuan Admin untuk upload...</Text>
          </Group>
        </Paper>
      )}

      {canUploadSigned && (
        <Button
          fullWidth
          size="lg"
          radius="md"
          color="blue"
          leftSection={<IconUpload size={20} />}
          mb="md"
          onClick={() => navigate(`/teknisi/dokumen/${id}/upload`)}
          styles={{ root: { height: 52, fontSize: 16, fontWeight: 600 } }}
        >
          Upload File TTD Klien
        </Button>
      )}

      {canUpload && (
        <Button
          fullWidth
          size="lg"
          radius="md"
          color="green"
          leftSection={<IconUpload size={20} />}
          mb="md"
          onClick={() => navigate(`/teknisi/dokumen/${id}/upload`)}
          styles={{ root: { height: 56, fontSize: 16, fontWeight: 600 } }}
        >
          📎 Upload File Evidence
        </Button>
      )}

      {/* Uploaded Files */}
      {task.uploads?.length > 0 && (
        <Paper p="lg" radius="md" shadow="sm" mb="md" style={{ border: '1px solid #e9ecef' }}>
          <Title order={5} fw={600} mb="sm">File yang Di-Upload</Title>
          {(() => {
            const renderFile = (f: any) => (
              <Card key={f.id} p="sm" radius="md" bg="gray.0">
                <Group justify="space-between" wrap="nowrap" gap="xs">
                  <a
                    href={getFileUrl(f.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none', color: '#228be6', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
                  >
                    <IconFile size={16} style={{ flexShrink: 0 }} />
                    <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>{f.file_name}</Text>
                  </a>
                  <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                    <Badge size="xs" variant="light" color="gray">{getFileExt(f)}</Badge>
                    <Badge size="xs" variant="light" color="blue">
                      {(f.file_size / 1024 / 1024).toFixed(2)} MB
                    </Badge>
                    <ActionIcon
                      component="a"
                      href={getFileUrl(f.file_path)}
                      download={f.file_name}
                      variant="subtle"
                      color="blue"
                      size="sm"
                      aria-label="Download file"
                    >
                      <IconDownload size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                {f.notes && (
                  <Text size="xs" c="dark" mt={6}>📝 Catatan: {f.notes}</Text>
                )}
              </Card>
            );
            const snFiles = task.uploads.filter((f: any) => isSnFile(f.file_name));
            const otherFiles = task.uploads.filter((f: any) => !isSnFile(f.file_name));
            return (
              <Stack gap="md">
                {snFiles.length > 0 && (
                  <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>Dokumen SN</Text>
                    <Stack gap="xs">{snFiles.map(renderFile)}</Stack>
                  </Box>
                )}
                {otherFiles.length > 0 && (
                  <Box>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>Dokumen Lain (SP/SPMK/FPP)</Text>
                    <Stack gap="xs">{otherFiles.map(renderFile)}</Stack>
                  </Box>
                )}
              </Stack>
            );
          })()}
        </Paper>
      )}

      {/* Activity Timeline */}
      <Paper p="lg" radius="lg" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <Title order={5} fw={600} mb="md">Riwayat Permintaan Izin</Title>
        {task.uploadPermissions?.length === 0 ? (
          <Text size="sm" c="dimmed">Belum ada riwayat permintaan.</Text>
        ) : (
          <Timeline active={task.uploadPermissions?.length - 1} bulletSize={24} lineWidth={2}>
            {task.uploadPermissions?.map((perm: any) => (
              <Timeline.Item
                key={perm.id}
                bullet={<ThemeIcon size={24} radius="xl" color={perm.status === 'approved' ? 'green' : perm.status === 'rejected' ? 'red' : 'orange'} variant="light"><IconCheck size={12} /></ThemeIcon>}
                title={<Text size="sm" fw={500} tt="capitalize">{perm.status}</Text>}
              >
                <Text size="xs" c="dimmed">Diminta pada: {dayjs(perm.requested_at).format('DD MMMYYYY, HH:mm')}</Text>
                {perm.responded_at && (
                  <Text size="xs" c="dimmed">Direspon pada: {dayjs(perm.responded_at).format('DD MMM YYYY, HH:mm')}</Text>
                )}
                {perm.admin_notes && (
                  <Text size="xs" c="orange" mt={4}>Catatan Admin: {perm.admin_notes}</Text>
                )}
              </Timeline.Item>
            ))}
          </Timeline>
        )}
      </Paper>
    </Box>
  );
}
