import { useState, useEffect } from 'react';
import {
  Paper, Title, Group, Button, TextInput, Select, Box,
  Badge, Text, ActionIcon, Menu, Modal, Stack, Avatar,
  Center, Loader,
} from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import {
  IconPlus, IconSearch, IconDotsVertical,
  IconTrash, IconUser, IconBrandTelegram, IconEdit
} from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

const ROLE_COLOR: Record<string, string> = { teknisi: 'blue', admin: 'violet', superadmin: 'red' };

export default function ManajemenUser() {
  const [search, setSearch] = useState('');
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Create
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string | null>(null);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form Edit
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<string | null>(null);
  const [editTelegramChatId, setEditTelegramChatId] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal memuat user', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!username || !password || !role) {
      return notifications.show({ title: 'Peringatan', message: 'Username, password, dan role wajib diisi', color: 'orange' });
    }
    setSubmitting(true);
    try {
      await api.post('/users', { username, email, password, role, telegram_chat_id: telegramChatId });
      notifications.show({ title: 'Sukses', message: 'User berhasil ditambahkan', color: 'green' });
      setAddModalOpened(false);
      setUsername('');
      setEmail('');
      setPassword('');
      setTelegramChatId('');
      setRole(null);
      fetchUsers();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal tambah user', color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditTelegramChatId(user.telegram_chat_id || '');
    setEditModalOpened(true);
  };

  const handleEditUser = async () => {
    if (!editUsername || !editRole) {
      return notifications.show({ title: 'Peringatan', message: 'Username dan role wajib diisi', color: 'orange' });
    }
    setEditing(true);
    try {
      await api.put(`/users/${editUser.id}`, { 
        username: editUsername, 
        email: editEmail, 
        role: editRole, 
        telegram_chat_id: editTelegramChatId 
      });
      notifications.show({ title: 'Sukses', message: 'User berhasil diperbarui', color: 'green' });
      setEditModalOpened(false);
      fetchUsers();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal memperbarui user', color: 'red' });
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    modals.openConfirmModal({
      title: 'Hapus User',
      centered: true,
      children: (
        <Text size="sm">
          Apakah Anda yakin ingin menghapus user <strong>{userName}</strong>? Tindakan ini tidak dapat dibatalkan.
        </Text>
      ),
      labels: { confirm: 'Hapus User', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/users/${userId}`);
          notifications.show({ title: 'Berhasil', message: `User ${userName} berhasil dihapus`, color: 'green' });
          fetchUsers();
        } catch (err: any) {
          notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal menghapus user', color: 'red' });
        }
      },
    });
  };

  const filtered = users.filter(
    (u) => u.username.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2} fw={700}>Manajemen User</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpened(true)}>Tambah User</Button>
      </Group>

      <Paper p="md" radius="md" mb="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <TextInput placeholder="Cari username atau email..." leftSection={<IconSearch size={16} />} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
      </Paper>

      {loading ? (
        <Center mt="xl"><Loader /></Center>
      ) : (
        <Paper radius="md" shadow="sm" style={{ border: '1px solid #e9ecef', overflow: 'hidden' }}>
          <DataTable
            withTableBorder={false} borderRadius="md" striped highlightOnHover minHeight={200}
            noRecordsText="Belum ada data pengguna"
            scrollAreaProps={{ type: 'always', offsetScrollbars: true }}
            records={filtered}
            columns={[
              {
                accessor: 'username', title: 'User',
                render: (r) => (
                  <Group gap="sm">
                    <Avatar size={32} radius="xl" color="blue">{r.username.charAt(0).toUpperCase()}</Avatar>
                    <Box>
                      <Text size="sm" fw={600} tt="capitalize">{r.username}</Text>
                      <Text size="xs" c="dimmed">{r.email}</Text>
                    </Box>
                  </Group>
                ),
              },
              {
                accessor: 'role', title: 'Role', width: 120, textAlign: 'center',
                render: (r) => <Badge color={ROLE_COLOR[r.role] || 'gray'} variant="light" size="sm" tt="capitalize">{r.role}</Badge>,
              },
              {
                accessor: 'telegram_chat_id', title: 'Telegram', width: 140,
                render: (r) => (
                  <Group gap={4}>
                    <IconBrandTelegram size={14} color={r.telegram_chat_id ? '#229ED9' : 'gray'} />
                    <Text size="sm" c={r.telegram_chat_id ? 'dark' : 'dimmed'}>{r.telegram_chat_id || '-'}</Text>
                  </Group>
                )
              },
              { 
                accessor: 'created_at', title: 'Terdaftar Sejak', width: 140,
                render: (r) => <Text size="sm">{dayjs(r.created_at).format('DD MMM YYYY')}</Text>
              },
              {
                accessor: 'aksi', title: 'Aksi', width: 60, textAlign: 'center',
                render: (r: any) => (
                  <Menu shadow="md" width={180} position="bottom-end">
                    <Menu.Target><ActionIcon variant="subtle" color="gray" size="sm"><IconDotsVertical size={16} /></ActionIcon></Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item 
                        leftSection={<IconEdit size={14} />} 
                        onClick={() => openEditModal(r)}
                      >
                        Edit
                      </Menu.Item>
                      <Menu.Item 
                        leftSection={<IconTrash size={14} />} 
                        color="red"
                        onClick={() => handleDeleteUser(r.id, r.username)}
                      >
                        Hapus
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ),
              },
            ]}
          />
        </Paper>
      )}

      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title={<Group gap="xs"><IconUser size={20} /><Text fw={600}>Tambah User Baru</Text></Group>} size="md" radius="md">
        <Stack gap="md">
          <TextInput label="Username *" placeholder="contoh: teknisi_baru" value={username} onChange={(e) => setUsername(e.currentTarget.value)} />
          <TextInput label="Email" placeholder="email@company.com (opsional)" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
          <TextInput label="Telegram Chat ID" placeholder="123456789" value={telegramChatId} onChange={(e) => setTelegramChatId(e.currentTarget.value)} leftSection={<IconBrandTelegram size={16} />} />
          <TextInput label="Password *" placeholder="Minimal 6 karakter" type="password" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
          <Select label="Role *" placeholder="Pilih role" data={[{ value: 'teknisi', label: 'Teknisi' }, { value: 'admin', label: 'Admin' }]} value={role} onChange={setRole} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Batal</Button>
            <Button onClick={handleCreateUser} loading={submitting}>✅ Simpan User</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={editModalOpened} onClose={() => setEditModalOpened(false)} title={<Group gap="xs"><IconEdit size={20} /><Text fw={600}>Edit User</Text></Group>} size="md" radius="md">
        <Stack gap="md">
          <TextInput label="Username *" placeholder="contoh: teknisi_baru" value={editUsername} onChange={(e) => setEditUsername(e.currentTarget.value)} />
          <TextInput label="Email" placeholder="email@company.com (opsional)" value={editEmail} onChange={(e) => setEditEmail(e.currentTarget.value)} />
          <TextInput label="Telegram Chat ID" placeholder="123456789" value={editTelegramChatId} onChange={(e) => setEditTelegramChatId(e.currentTarget.value)} leftSection={<IconBrandTelegram size={16} />} />
          <Select label="Role *" placeholder="Pilih role" data={[{ value: 'teknisi', label: 'Teknisi' }, { value: 'admin', label: 'Admin' }, { value: 'superadmin', label: 'Superadmin' }]} value={editRole} onChange={setEditRole} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditModalOpened(false)}>Batal</Button>
            <Button onClick={handleEditUser} loading={editing}>✅ Simpan Perubahan</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
