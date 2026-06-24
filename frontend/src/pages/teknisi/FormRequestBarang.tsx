import { useState, useEffect } from 'react';
import {
  Box, Title, Text, Paper, Button, Stack, Select,
  NumberInput, Textarea, Center, Loader,
} from '@mantine/core';
import { IconArrowLeft, IconSend } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '../../lib/axios';

export default function FormRequestBarang() {
  const navigate = useNavigate();
  const [itemOptions, setItemOptions] = useState<{value: string, label: string}[]>([]);
  const [docOptions, setDocOptions] = useState<{value: string, label: string}[]>([]);
  
  const [item, setItem] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | ''>(1);
  const [reason, setReason] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, docRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/documents/my-tasks')
        ]);

        // Backend returns array directly
        const invData = Array.isArray(invRes.data) ? invRes.data : (invRes.data.data || []);
        setItemOptions(invData.filter((i: any) => i.is_active).map((i: any) => ({
          value: String(i.id),
          label: `${i.name} (${i.unit}) - Stok: ${i.stock_qty}`  // DB field is stock_qty
        })));

        setDocOptions(docRes.data.map((d: any) => ({
          value: String(d.id),
          label: `${d.document_number} - ${d.title}`
        })));
      } catch (err) {
        console.error('Failed to load form options', err);
        notifications.show({ title: 'Error', message: 'Gagal memuat data barang', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (!item || !qty || !reason) {
      notifications.show({ title: 'Error', message: 'Field barang, jumlah dan alasan wajib diisi', color: 'red' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/inventory-requests', {
        item_id: Number(item),
        quantity: typeof qty === 'string' ? 1 : qty,
        reason,
        document_id: documentId ? Number(documentId) : undefined,
      });

      notifications.show({ title: 'Berhasil!', message: 'Permintaan barang berhasil diajukan', color: 'green' });
      navigate('/teknisi/inventaris');
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal mengajukan permintaan', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  return (
    <Box>
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)} mb="md" px={0}>
        Kembali
      </Button>

      <Title order={3} fw={700} mb="xs">Permintaan Barang</Title>
      <Text size="sm" c="dimmed" mb="lg">Ajukan permintaan alat atau material kerja</Text>

      <Paper p="lg" radius="lg" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <Stack gap="md">
          <Select
            label="Pilih Barang *"
            placeholder="Cari barang..."
            data={itemOptions}
            value={item}
            onChange={setItem}
            searchable
            size="md"
          />

          <NumberInput
            label="Jumlah *"
            placeholder="Masukkan jumlah"
            min={1}
            value={qty}
            onChange={(v) => setQty(Number(v) || '')}
            size="md"
          />

          <Select
            label="Terkait Dokumen (Opsional)"
            placeholder="Pilih jika terkait dokumen SP/SPMK"
            data={docOptions}
            value={documentId}
            onChange={setDocumentId}
            searchable
            clearable
            size="md"
          />

          <Textarea
            label="Alasan Permintaan *"
            placeholder="Jelaskan mengapa barang ini dibutuhkan..."
            minRows={4}
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            size="md"
          />

          <Button
            fullWidth size="lg" radius="md"
            leftSection={<IconSend size={18} />}
            onClick={handleSubmit}
            loading={submitting}
            styles={{ root: { height: 52, fontSize: 16, fontWeight: 600 } }}
          >
            Ajukan Permintaan
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
