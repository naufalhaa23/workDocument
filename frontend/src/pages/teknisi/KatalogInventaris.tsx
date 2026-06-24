import { useState, useEffect } from 'react';
import {
  Box, Title, Text, Card, Group, Badge, Stack, TextInput,
  Select, Button, ThemeIcon, Center, Loader,
} from '@mantine/core';
import { IconSearch, IconPackage, IconAlertTriangle, IconPlus, IconHistory } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';

export default function KatalogInventaris() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await api.get('/inventory');
        // Backend returns array directly
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setItems(data.filter((i: any) => i.is_active));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase()) || i.item_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || i.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Box>
          <Title order={3} fw={700}>Katalog Inventaris</Title>
          <Text size="sm" c="dimmed">Lihat ketersediaan barang &amp; material</Text>
        </Box>
        <Group gap="xs">
          <Button
            size="sm" radius="md" variant="outline"
            leftSection={<IconHistory size={16} />}
            onClick={() => navigate('/teknisi/inventaris/history')}
          >
            Riwayat
          </Button>
          <Button size="sm" radius="md" leftSection={<IconPlus size={16} />} onClick={() => navigate('/teknisi/inventaris/request')}>
            Ajukan
          </Button>
        </Group>
      </Group>

      <TextInput
        placeholder="Cari barang..."
        leftSection={<IconSearch size={16} />}
        value={search} onChange={(e) => setSearch(e.currentTarget.value)}
        mb="sm" radius="md"
      />
      <Select
        placeholder="Kategori: Semua"
        data={['Mesin', 'Elektrikal', 'Pelumas', 'Tools', 'Safety', 'ATK']}
        value={filterCategory} onChange={setFilterCategory}
        clearable mb="md" radius="md" size="sm"
      />

      {loading ? (
        <Center mt="xl"><Loader /></Center>
      ) : (
        <Stack gap="sm">
          {filtered.map((item) => (
            <Card key={item.id} padding="md" radius="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                  <ThemeIcon variant="light" color="blue" radius="md" size="lg">
                    <IconPackage size={18} />
                  </ThemeIcon>
                  <Box style={{ minWidth: 0, flex: 1 }}>
                    <Text size="xs" c="dimmed">{item.item_code}</Text>
                    <Text size="sm" fw={600} truncate>{item.name}</Text>
                    <Badge size="xs" variant="light" color="gray" mt={2}>{item.category}</Badge>
                  </Box>
                </Group>
                <Box ta="right">
                  <Group gap={4} justify="flex-end">
                    <Text size="lg" fw={700} c={item.stock_qty <= item.min_stock ? 'red' : undefined}>{item.stock_qty}</Text>
                    {item.stock_qty <= item.min_stock && <IconAlertTriangle size={14} color="#e03131" />}
                  </Group>
                  <Text size="xs" c="dimmed">{item.unit}</Text>
                </Box>
              </Group>
            </Card>
          ))}
          {filtered.length === 0 && <Text ta="center" c="dimmed" size="sm">Barang tidak ditemukan.</Text>}
        </Stack>
      )}


    </Box>
  );
}
