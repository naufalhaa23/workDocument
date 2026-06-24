import { useState, useEffect, useCallback } from 'react';
import {
  Paper, Title, Group, Button, TextInput, Select, Box,
  Badge, Text, ActionIcon, Menu, Modal, Stack, NumberInput, Switch,
  Textarea, SimpleGrid,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import {
  IconPlus, IconSearch, IconDotsVertical,
  IconEdit, IconTrash, IconPackage, IconAlertTriangle,
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';

export default function MasterInventaris() {
  const [items, setItems] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category: '',
    description: '',
    unit: '',
    stock: 0,
    min_stock: 0,
    is_active: true,
  });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory', {
        params: {
          search: debouncedSearch || undefined,
          category: filterCategory || undefined,
        }
      });
      // Backend returns array directly
      const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setItems(data);
      setTotalRecords(data.length);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat inventaris', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAdd = () => {
    setFormData({
      item_code: '', name: '', category: '', description: '', unit: '', stock: 0, min_stock: 0, is_active: true,
    });
    setAddModalOpened(true);
  };

  const handleOpenEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      item_code: item.item_code,
      name: item.name,
      category: item.category || '',
      description: item.description || '',
      unit: item.unit,
      stock: item.stock_qty,        // DB field is stock_qty
      min_stock: item.min_stock,
      is_active: item.is_active,
    });
    setEditModalOpened(true);
  };

  const handleSave = async () => {
    try {
      if (editModalOpened && selectedItem) {
        await api.put(`/inventory/${selectedItem.id}`, formData);
        notifications.show({ title: 'Sukses', message: 'Barang diupdate', color: 'green' });
      } else {
        await api.post('/inventory', formData);
        notifications.show({ title: 'Sukses', message: 'Barang ditambahkan', color: 'green' });
      }
      setAddModalOpened(false);
      setEditModalOpened(false);
      fetchItems();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal menyimpan', color: 'red' });
    }
  };

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: 'Hapus Barang',
      centered: true,
      children: (
        <Text size="sm">
          Apakah Anda yakin ingin menghapus barang ini? Data tidak dapat dikembalikan.
        </Text>
      ),
      labels: { confirm: 'Hapus', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/inventory/${id}`);
          notifications.show({ title: 'Sukses', message: 'Barang dihapus', color: 'green' });
          if (items.length === 1 && page > 1) setPage(page - 1);
          else fetchItems();
        } catch (err: any) {
          notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal menghapus', color: 'red' });
        }
      }
    });
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2} fw={700}>Master Inventaris</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAdd}>
          Tambah Barang
        </Button>
      </Group>

      <Paper p="md" radius="md" mb="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <TextInput
            placeholder="Cari kode atau nama barang..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
          />
          <Select
            placeholder="Kategori: Semua"
            data={['Mesin', 'Elektrikal', 'Pelumas', 'Tools', 'Safety', 'ATK']}
            value={filterCategory}
            onChange={(v) => { setFilterCategory(v); setPage(1); }}
            clearable
          />
        </SimpleGrid>
      </Paper>

      <Paper radius="md" shadow="sm" style={{ border: '1px solid #e9ecef', overflow: 'hidden' }}>
        <DataTable
          withTableBorder={false}
          borderRadius="md"
          noRecordsText="Belum ada data inventaris"
          striped
          highlightOnHover
          minHeight={300}
          scrollAreaProps={{ type: 'always', offsetScrollbars: true }}
          fetching={loading}
          records={items}
          totalRecords={totalRecords}
          recordsPerPage={PAGE_SIZE}
          page={page}
          onPageChange={setPage}
          columns={[
            { accessor: 'item_code', title: 'Kode', width: 100, render: (r) => <Text size="sm" fw={600}>{r.item_code}</Text> },
            { accessor: 'name', title: 'Nama Barang' },
            {
              accessor: 'category', title: 'Kategori', width: 110,
              render: (r) => <Badge variant="light" color="gray" size="sm">{r.category}</Badge>,
            },
            { accessor: 'unit', title: 'Satuan', width: 80 },
            {
              accessor: 'stock_qty', title: 'Stok', width: 80, textAlign: 'center',
              render: (r) => (
                <Group gap={4} justify="center">
                  <Text size="sm" fw={600} c={r.stock_qty <= r.min_stock ? 'red' : undefined}>{r.stock_qty}</Text>
                  {r.stock_qty <= r.min_stock && <IconAlertTriangle size={14} color="#e03131" />}
                </Group>
              ),
            },
            { accessor: 'min_stock', title: 'Min', width: 60, textAlign: 'center' },
            {
              accessor: 'is_active', title: 'Status', width: 80, textAlign: 'center',
              render: (r) => <Badge color={r.is_active ? 'green' : 'red'} variant="light" size="sm">{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge>,
            },
            {
              accessor: 'aksi', title: 'Aksi', width: 60, textAlign: 'center',
              render: (r) => (
                <Menu shadow="md" width={160} position="bottom-end">
                  <Menu.Target><ActionIcon variant="subtle" color="gray" size="sm"><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleOpenEdit(r)}>Edit</Menu.Item>
                    <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(r.id)}>Hapus</Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ),
            },
          ]}
        />
      </Paper>

      {/* Add/Edit Modal */}
      <Modal 
        opened={addModalOpened || editModalOpened} 
        onClose={() => { setAddModalOpened(false); setEditModalOpened(false); }} 
        title={<Group gap="xs"><IconPackage size={20} /><Text fw={600}>{editModalOpened ? 'Edit Barang' : 'Tambah Barang Baru'}</Text></Group>} 
        size="lg" radius="md"
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput 
              label="Kode Barang *" 
              placeholder="EL-004" 
              value={formData.item_code}
              onChange={(e) => setFormData({ ...formData, item_code: e.currentTarget.value })}
            />
            <Select 
              label="Kategori *" 
              placeholder="Pilih kategori" 
              data={['Mesin', 'Elektrikal', 'Pelumas', 'Tools', 'Safety', 'ATK']} 
              value={formData.category}
              onChange={(v) => setFormData({ ...formData, category: v || '' })}
            />
          </SimpleGrid>
          <TextInput 
            label="Nama Barang *" 
            placeholder="Nama barang/material" 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
          />
          <Textarea 
            label="Deskripsi" 
            placeholder="Deskripsi opsional..." minRows={2} 
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.currentTarget.value })}
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <TextInput 
              label="Satuan *" placeholder="pcs, meter, dll" 
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.currentTarget.value })}
            />
            <NumberInput 
              label="Stok *" min={0} 
              value={formData.stock}
              onChange={(v) => setFormData({ ...formData, stock: Number(v) || 0 })}
            />
            <NumberInput 
              label="Min. Stok *" min={0} 
              value={formData.min_stock}
              onChange={(v) => setFormData({ ...formData, min_stock: Number(v) || 0 })}
            />
          </SimpleGrid>
          <Switch 
            label="Aktifkan barang ini" 
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.currentTarget.checked })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setAddModalOpened(false); setEditModalOpened(false); }}>Batal</Button>
            <Button onClick={handleSave} loading={loading}>✅ Simpan Barang</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
