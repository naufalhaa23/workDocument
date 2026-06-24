import { useState, useEffect, useCallback } from 'react';
import {
  Paper, Title, Group, Text, Box, Badge, Button, Stack,
  Tabs, Textarea, Modal, Avatar, SimpleGrid, Center, Loader,
} from '@mantine/core';
import {
  IconCheck, IconX, IconUpload, IconPackage, IconClock,
  IconFileText,
} from '@tabler/icons-react';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useSocketConnection } from '../../hooks/useSocket';

export default function ApprovalQueue() {
  const location = useLocation();
  const defaultTab = location.pathname.includes('requests') ? 'inventory' : 'upload';
  
  const [rejectModalOpened, setRejectModalOpened] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(defaultTab);
  
  const [uploadRequests, setUploadRequests] = useState<any[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the currently selected request to be rejected
  const [selectedReject, setSelectedReject] = useState<{ id: number, type: 'upload' | 'inventory' } | null>(null);

  const socket = useSocketConnection();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uploadRes, invRes] = await Promise.all([
        api.get('/uploads/permissions?status=pending'),
        api.get('/inventory-requests?status=pending')
      ]);
      setUploadRequests(uploadRes.data);
      setInventoryRequests(invRes.data);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat data persetujuan', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleRemoteUpdate = () => {
      fetchData(); // Refetch when receiving notifications or activity indicating new requests
    };
    socket.on('notification:new', handleRemoteUpdate);
    socket.on('activity:new', handleRemoteUpdate);
    return () => {
      socket.off('notification:new', handleRemoteUpdate);
      socket.off('activity:new', handleRemoteUpdate);
    };
  }, [socket, fetchData]);

  const handleApproveUpload = async (id: number) => {
    try {
      await api.patch(`/uploads/permissions/${id}`, { status: 'approved' });
      notifications.show({ title: 'Sukses', message: 'Izin upload diberikan', color: 'green' });
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal menyetujui', color: 'red' });
    }
  };

  const handleApproveInventory = async (id: number) => {
    try {
      await api.patch(`/inventory-requests/${id}`, { status: 'approved' });
      notifications.show({ title: 'Sukses', message: 'Permintaan barang disetujui', color: 'green' });
      fetchData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal menyetujui', color: 'red' });
    }
  };

  const handleReject = async () => {
    if (!selectedReject) return;
    try {
      if (selectedReject.type === 'upload') {
        await api.patch(`/uploads/permissions/${selectedReject.id}`, { status: 'rejected', admin_notes: rejectReason });
      } else {
         await api.patch(`/inventory-requests/${selectedReject.id}`, { status: 'rejected', admin_notes: rejectReason });
      }
      notifications.show({ title: 'Berhasil', message: 'Permintaan ditolak', color: 'green' });
      setRejectModalOpened(false);
      setRejectReason('');
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal menolak permintaan', color: 'red' });
    }
  };

  const openRejectModal = (id: number, type: 'upload' | 'inventory') => {
    setSelectedReject({ id, type });
    setRejectReason('');
    setRejectModalOpened(true);
  };

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2} fw={700}>Antrian Persetujuan</Title>
        <Group gap="xs">
          <Badge color="orange" variant="light" size="lg">
            {uploadRequests.length + inventoryRequests.length} Pending
          </Badge>
        </Group>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="lg">
          <Tabs.Tab
            value="upload"
            leftSection={<IconUpload size={16} />}
            rightSection={
              <Badge color="blue" variant="filled" size="xs" circle>
                {uploadRequests.length}
              </Badge>
            }
          >
            Izin Upload
          </Tabs.Tab>
          <Tabs.Tab
            value="inventory"
            leftSection={<IconPackage size={16} />}
            rightSection={
              <Badge color="orange" variant="filled" size="xs" circle>
                {inventoryRequests.length}
              </Badge>
            }
          >
            Permintaan Barang
          </Tabs.Tab>
        </Tabs.List>

        {/* Upload Permission Requests */}
        <Tabs.Panel value="upload">
          <Stack gap="md">
            {uploadRequests.map((req) => (
              <Paper key={req.id} p="lg" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Avatar color="blue" radius="xl">{req.requester?.username.charAt(0)}</Avatar>
                    <Box>
                      <Text fw={600} size="sm" tt="capitalize">{req.requester?.username}</Text>
                      <Text size="xs" c="dimmed">Meminta izin upload dokumen</Text>
                    </Box>
                  </Group>
                  <Badge color="orange" variant="light" leftSection={<IconClock size={12} />}>
                    Menunggu
                  </Badge>
                </Group>

                <Paper p="sm" radius="md" bg="gray.0" mb="md">
                  <Group gap="xs" mb={4}>
                    <IconFileText size={14} color="#868e96" />
                    <Text size="sm" fw={600}>{req.document?.document_number}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">{req.document?.title}</Text>
                  <Text size="xs" c="dimmed" mt={4}>Diajukan: {dayjs(req.requested_at).format('DD MMM YYYY, HH:mm')} WIB</Text>
                </Paper>

                <Group justify="flex-end" gap="sm">
                  <Button
                    variant="light" color="red" leftSection={<IconX size={14} />} size="sm"
                    onClick={() => openRejectModal(req.id, 'upload')}
                  >
                    Tolak
                  </Button>
                  <Button
                    color="green" leftSection={<IconCheck size={14} />} size="sm"
                    onClick={() => handleApproveUpload(req.id)}
                  >
                    Izinkan Upload
                  </Button>
                </Group>
              </Paper>
            ))}

            {uploadRequests.length === 0 && (
              <Paper p="xl" radius="md" ta="center" style={{ border: '1px dashed #ced4da' }}>
                <Text c="dimmed">Tidak ada permintaan izin upload yang menunggu.</Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>

        {/* Inventory Requests */}
        <Tabs.Panel value="inventory">
          <Stack gap="md">
            {inventoryRequests.map((req) => (
              <Paper key={req.id} p="lg" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Avatar color="orange" radius="xl">{req.requestedBy?.username.charAt(0)}</Avatar>
                    <Box>
                      <Text fw={600} size="sm" tt="capitalize">{req.requestedBy?.username}</Text>
                      <Text size="xs" c="dimmed">Mengajukan permintaan barang</Text>
                    </Box>
                  </Group>
                  <Badge color="orange" variant="light" leftSection={<IconClock size={12} />}>
                    Menunggu
                  </Badge>
                </Group>

                <Paper p="sm" radius="md" bg="gray.0" mb="md">
                  <SimpleGrid cols={3} spacing="xs" mb="xs">
                    <Box>
                      <Text size="xs" c="dimmed">Barang</Text>
                      <Text size="sm" fw={600}>{req.item?.name}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Jumlah Diminta</Text>
                      <Text size="sm" fw={600}>{req.quantity} {req.item?.unit}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">Stok Tersedia</Text>
                      <Text size="sm" c={req.item?.stock >= req.quantity ? 'green' : 'red'}>
                        {req.item?.stock} {req.item?.unit}
                      </Text>
                    </Box>
                  </SimpleGrid>
                  <Box mb="xs">
                    <Text size="xs" c="dimmed">Terkait Dokumen</Text>
                    <Text size="sm">{req.document?.document_number || '-'}</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed">Alasan</Text>
                    <Text size="sm">{req.reason}</Text>
                  </Box>
                  <Text size="xs" c="dimmed" mt="xs">Diajukan: {dayjs(req.requested_at).format('DD MMM YYYY, HH:mm')} WIB</Text>
                </Paper>

                <Group justify="flex-end" gap="sm">
                  <Button
                    variant="light" color="red" leftSection={<IconX size={14} />} size="sm"
                    onClick={() => openRejectModal(req.id, 'inventory')}
                  >
                    Tolak
                  </Button>
                  <Button
                    color="green" leftSection={<IconCheck size={14} />} size="sm"
                    onClick={() => handleApproveInventory(req.id)}
                    disabled={req.item?.stock < req.quantity}
                  >
                    Setujui
                  </Button>
                </Group>
              </Paper>
            ))}
            
            {inventoryRequests.length === 0 && (
              <Paper p="xl" radius="md" ta="center" style={{ border: '1px dashed #ced4da' }}>
                <Text c="dimmed">Tidak ada permintaan barang yang menunggu.</Text>
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Reject Reason Modal */}
      <Modal
        opened={rejectModalOpened}
        onClose={() => setRejectModalOpened(false)}
        title={<Text fw={600}>Alasan Penolakan</Text>}
        size="md"
        radius="md"
      >
        <Stack>
          <Textarea
            label="Catatan untuk Teknisi"
            placeholder="Masukkan alasan penolakan..."
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setRejectModalOpened(false)}>Batal</Button>
            <Button color="red" onClick={handleReject}>❌ Konfirmasi Tolak</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
