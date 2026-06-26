import { useEffect, useState, useMemo } from 'react';
import {
  Box, Container, Title, Group, TextInput, Select, Text,
  Stack, Badge, ScrollArea, Center, Loader, Flex, Button,
  Modal, Drawer, Divider, Paper,
  PasswordInput, UnstyledButton
} from '@mantine/core';
import { IconSearch, IconShip, IconCalendar, IconFileDescription, IconLogin, IconLock } from '@tabler/icons-react';
import { useDebouncedValue, useSessionStorage, useMediaQuery } from '@mantine/hooks';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../../lib/axios';
import { getFileExt, isSnFile } from '../../lib/fileUtils';

interface PublicDocument {
  id: number;
  document_number: string;
  title: string;
  status: string;
  nama_kapal: string | null;
  document_date: string;
}

const KANBAN_COLUMNS = [
  {
    id: 'list_pekerjaan',
    title: 'LIST PEKERJAAN',
    statuses: ['proses', 'menunggu_izin', 'upload_diizinkan'],
    borderColor: '#9CA3AF', // Gray 400
  },
  {
    id: 'draft',
    title: 'DRAFT SN',
    statuses: ['draft_sn'],
    borderColor: '#6D28D9', // Amber 400
  },
  {
    id: 'pra_ttd',
    title: 'PRA TTD',
    statuses: ['draft_pra'],
    borderColor: '#60A5FA', // Blue 400
  },
  {
    id: 'ttd',
    title: 'TANDA TANGAN',
    statuses: ['assigned'],
    borderColor: '#1D4ED8', // Purple 400
  },
  {
    id: 'selesai',
    title: 'SELESAI',
    statuses: ['selesai'],
    borderColor: '#34D399', // Emerald 400
  }
];

// Card color bucket per workflow stage
type Bucket = 'proses' | 'draft_sn' | 'selesai';
const bucketOf = (status: string): Bucket => {
  if (status === 'selesai') return 'selesai';
  if (['draft_sn', 'draft_pra', 'assigned'].includes(status)) return 'draft_sn';
  return 'proses'; // proses, menunggu_izin, upload_diizinkan
};
const BUCKET_STYLE: Record<Bucket, { bg: string; border: string }> = {
  proses: { bg: '#ffffff', border: '#E5E7EB' },     // belum ada draft SN → putih
  draft_sn: { bg: '#FEF3C7', border: '#FCD34D' },   // sudah draft SN, belum close → kuning/oren
  selesai: { bg: '#D1FAE5', border: '#6EE7B7' },    // close TTD → hijau
};

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  proses: { label: 'PROSES', bg: '#DBEAFE', color: '#1D4ED8' },
  menunggu_izin: { label: 'MENUNGGU IZIN', bg: '#FEF3C7', color: '#B45309' },
  upload_diizinkan: { label: 'UPLOAD OK', bg: '#D1FAE5', color: '#047857' },
  draft_sn: { label: 'DRAFT SN', bg: '#EDE9FE', color: '#6D28D9' },
  draft_pra: { label: 'PRA TTD', bg: '#FEF3C7', color: '#B45309' },
  assigned: { label: 'ASSIGNED', bg: '#DBEAFE', color: '#1D4ED8' },
  selesai: { label: 'SELESAI', bg: '#D1FAE5', color: '#047857' },
};

export default function PublicBoard() {
  const [accessCode, setAccessCode] = useSessionStorage({ key: 'board-access-code', defaultValue: '' });
  const [tempCode, setTempCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');

  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [vessels, setVessels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [filterVessel, setFilterVessel] = useState<string | null>(null);

  // Mobile layout state
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState(KANBAN_COLUMNS[0].id);
  const [filterOpened, setFilterOpened] = useState(false);

  // Detail Drawer state
  const [detailOpened, setDetailOpened] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const fetchVessels = async () => {
    try {
      const res = await api.get('/public/vessels', { headers: { 'x-board-code': accessCode } });
      setVessels(res.data);
    } catch (err: any) {
      if (err.response?.status === 403) setIsAuthorized(false);
    }
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/public/documents', {
        headers: { 'x-board-code': accessCode },
        params: {
          search: debouncedSearch || undefined,
          nama_kapal: filterVessel || undefined
        }
      });
      setDocuments(res.data);
      setIsAuthorized(true);
      setAuthError('');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsAuthorized(false);
        setAuthError('Kode akses tidak valid atau ditolak.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessCode) {
      fetchVessels();
      fetchDocuments();

      const socketUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';
      const socket = io(socketUrl, {
        query: { public: 'true' }
      });

      socket.on('board:updated', () => {
        fetchDocuments();
      });

      return () => {
        socket.disconnect();
      };
    } else {
      setIsAuthorized(false);
    }
  }, [accessCode, debouncedSearch, filterVessel]);

  const handleVerifyCode = () => {
    setAccessCode(tempCode);
  };

  // Make the mobile back gesture close an open overlay instead of leaving the board.
  // Opening an overlay pushes a dummy history entry; pressing back (or X) pops it.
  useEffect(() => {
    const onPopState = () => {
      setDetailOpened(false);
      setFilterOpened(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const pushOverlayHistory = () => {
    if (!window.history.state?.boardOverlay) {
      window.history.pushState({ boardOverlay: true }, '');
    }
  };

  // Unified close for both drawers: pop the dummy entry so the back gesture and X behave the same
  const closeOverlay = () => {
    if (window.history.state?.boardOverlay) {
      window.history.back(); // triggers popstate → closes the drawer
    } else {
      setDetailOpened(false);
      setFilterOpened(false);
    }
  };

  const openFilter = () => {
    pushOverlayHistory();
    setFilterOpened(true);
  };

  const openDocumentDetail = async (id: number) => {
    pushOverlayHistory();
    setDetailOpened(true);
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/public/documents/${id}`, {
        headers: { 'x-board-code': accessCode }
      });
      setSelectedDoc(res.data);
    } catch (err) {
      console.error('Failed to load detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const columnData = useMemo(() => {
    const data: Record<string, PublicDocument[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      data[col.id] = documents.filter(doc => col.statuses.includes(doc.status));
    });
    return data;
  }, [documents]);

  // View: Access Code Modal
  if (!isAuthorized) {
    return (
      <Box mih="100vh" style={{ backgroundColor: '#F9FAFB' }}>
        <Modal opened={!isAuthorized} onClose={() => {}} withCloseButton={false} centered>
          <Stack align="center" gap="md" py="xl">
            <IconLock size={48} color="#9CA3AF" />
            <Title order={3}>Akses Dibutuhkan</Title>
            <Text size="sm" c="dimmed" ta="center">
              Board Kanban ini bersifat privat. Silakan masukkan kode akses yang diberikan oleh Superadmin.
            </Text>
            {authError && <Text size="sm" c="red">{authError}</Text>}
            <PasswordInput
              placeholder="Masukkan kode akses"
              value={tempCode}
              onChange={(e) => setTempCode(e.currentTarget.value)}
              w="100%"
              onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyCode(); }}
            />
            <Button w="100%" onClick={handleVerifyCode}>Akses Board</Button>
          </Stack>
        </Modal>
      </Box>
    );
  }

  return (
    <Box
      mih="100vh"
      style={{
        backgroundColor: '#F9FAFB',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{`
        .kanban-card {
          background-color: #ffffff;
          border: 1px solid #F3F4F6;
          border-radius: 10px;
          padding: 10px 12px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          max-width: 100%;
          word-break: break-word;
        }
        .kanban-card:hover {
          background-color: #F9FAFB;
          border-color: #E5E7EB;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 120px;
          border: 2px dashed #E5E7EB;
          border-radius: 12px;
          background-color: #F9FAFB;
        }
      `}</style>

      {/* ─── Premium Header Section ─── */}
      <Container fluid px={24} pt={32} pb={20}>
        <Flex justify="space-between" align="flex-start" mb="xl">
          <Box pr="md">
            <Title order={1} size="h3" fw={700} c="gray.9" style={{ letterSpacing: '-0.5px' }}>
              Board — Status Dokumen
            </Title>
            <Text c="dimmed" size="sm" mt={4}>
              Pantau alur dokumen pekerjaan secara real-time.
            </Text>
          </Box>
          <Button
            component={Link}
            to="/login"
            variant="light"
            color="blue"
            leftSection={<IconLogin size={16} />}
            size="sm"
            style={{ flexShrink: 0 }}
          >
            {isMobile ? 'Login' : 'Login Sistem'}
          </Button>
        </Flex>

        {isMobile ? (
          <Button
            variant="default"
            fullWidth
            leftSection={<IconSearch size={16} color="#9CA3AF" />}
            rightSection={(search || filterVessel) && <Badge color="blue" size="xs" circle />}
            onClick={openFilter}
            styles={{ inner: { justifyContent: 'flex-start' }, root: { backgroundColor: '#ffffff', border: '1px solid #E5E7EB', height: 42 } }}
            radius="md"
          >
            <Text fw={400} c="gray.6">Cari & Filter Kapal...</Text>
          </Button>
        ) : (
          <Group gap="sm">
            <TextInput
              placeholder="Cari judul dokumen..."
              leftSection={<IconSearch size={16} color="#9CA3AF" />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              size="sm"
              radius="md"
              styles={{ input: { backgroundColor: '#ffffff', width: 280, border: '1px solid #E5E7EB' } }}
            />
            <Select
              placeholder="Semua Kapal / Lokasi"
              leftSection={<IconShip size={16} color="#9CA3AF" />}
              data={vessels}
              value={filterVessel}
              onChange={setFilterVessel}
              clearable
              searchable
              size="sm"
              radius="md"
              styles={{ input: { backgroundColor: '#ffffff', width: 220, border: '1px solid #E5E7EB' } }}
            />
          </Group>
        )}
      </Container>

      {/* ─── Board Content ─── */}
      <Container fluid px={24} pb={40}>
        {isLoading && documents.length === 0 ? (
          <Center h={400}>
            <Loader size="md" color="gray" />
          </Center>
        ) : isMobile ? (
          // Mobile View: Tab-based
          <Box>
            <ScrollArea type="never" mb="lg">
              <Flex gap={8} wrap="nowrap" pb={4} style={{ overflowX: 'auto' }}>
                {KANBAN_COLUMNS.map(col => {
                  const isActive = activeTab === col.id;
                  const count = columnData[col.id]?.length || 0;
                  return (
                    <UnstyledButton
                      key={col.id}
                      onClick={() => setActiveTab(col.id)}
                      style={{
                        whiteSpace: 'nowrap',
                        padding: '6px 14px',
                        borderRadius: '99px',
                        backgroundColor: isActive ? '#3B82F6' : '#F3F4F6', // Blue if active, else Gray
                        color: isActive ? '#FFFFFF' : '#4B5563', // White if active, else Gray text
                        fontWeight: 600,
                        fontSize: '13px',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid',
                        borderColor: isActive ? '#2563EB' : '#E5E7EB',
                      }}
                    >
                      {col.title}
                      <Box
                        style={{
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : '#E5E7EB',
                          color: isActive ? '#FFFFFF' : '#374151',
                          padding: '2px 6px',
                          borderRadius: '99px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {count}
                      </Box>
                    </UnstyledButton>
                  );
                })}
              </Flex>
            </ScrollArea>
            
            <ScrollArea.Autosize mah="calc(100vh - 220px)" type="auto" offsetScrollbars>
            <Stack gap={8}>
              {columnData[activeTab]?.length === 0 ? (
                <Box className="empty-state">
                  <IconFileDescription size={24} color="#D1D5DB" style={{ marginBottom: 8 }} />
                  <Text size="xs" fw={500} c="gray.4">Belum ada dokumen</Text>
                </Box>
              ) : (
                columnData[activeTab]?.map(doc => {
                  const badge = STATUS_BADGE[doc.status] || { label: doc.status, bg: '#F3F4F6', color: '#374151' };
                  return (
                    <Box key={doc.id} className="kanban-card" style={{ backgroundColor: BUCKET_STYLE[bucketOf(doc.status)].bg, borderColor: BUCKET_STYLE[bucketOf(doc.status)].border }} onClick={() => openDocumentDetail(doc.id)}>
                      <Text size="sm" fw={600} c="gray.9" lineClamp={2} mb={6} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{doc.title}</Text>
                      <Flex align="center" gap={8} wrap="nowrap">
                        <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <IconShip size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
                          <Text size="xs" c="gray.5" fw={500} truncate>{doc.nama_kapal || '-'}</Text>
                        </Group>
                        <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                          <IconCalendar size={13} color="#9CA3AF" />
                          <Text size="xs" c="gray.5" fw={500} style={{ whiteSpace: 'nowrap' }}>{dayjs(doc.document_date).format('DD MMM YYYY')}</Text>
                        </Group>
                        <Text
                          component="span"
                          style={{
                            backgroundColor: badge.bg, color: badge.color,
                            fontSize: 9, fontWeight: 700, padding: '3px 6px',
                            borderRadius: 5, textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0
                          }}
                        >
                          {badge.label}
                        </Text>
                      </Flex>
                    </Box>
                  );
                })
              )}
            </Stack>
            </ScrollArea.Autosize>
          </Box>
        ) : (
          // Desktop View: Horizontal scroll
          <ScrollArea type="auto" offsetScrollbars>
            <Flex gap={24} align="flex-start" wrap="nowrap" pb={20} style={{ minWidth: 1200 }}>
              {KANBAN_COLUMNS.map((column) => {
                const cards = columnData[column.id];
                return (
                  <Box
                    key={column.id}
                    style={{
                      flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 16,
                      minWidth: 0, backgroundColor: '#F3F4F6', padding: '12px', borderRadius: '8px',
                    }}
                  >
                    <Flex align="center" justify="space-between" pt={12} style={{ borderTop: `3px solid ${column.borderColor}` }}>
                      <Group gap={8} align="center">
                        <Text fw={700} c="gray.8" style={{ fontSize: 12, letterSpacing: '0.05em' }}>{column.title}</Text>
                        <Badge color="blue.1" c="blue.7" variant="filled" size="sm" radius="sm">{cards.length} Dokumen</Badge>
                      </Group>
                    </Flex>
                    <ScrollArea.Autosize mah="calc(100vh - 240px)" type="auto" offsetScrollbars>
                    <Stack gap={8}>
                      {cards.length === 0 ? (
                        <Box className="empty-state">
                          <IconFileDescription size={24} color="#D1D5DB" style={{ marginBottom: 8 }} />
                          <Text size="xs" fw={500} c="gray.4">Belum ada dokumen</Text>
                        </Box>
                      ) : (
                        cards.map(doc => {
                          const badge = STATUS_BADGE[doc.status] || { label: doc.status, bg: '#F3F4F6', color: '#374151' };
                          return (
                            <Box key={doc.id} className="kanban-card" style={{ backgroundColor: BUCKET_STYLE[bucketOf(doc.status)].bg, borderColor: BUCKET_STYLE[bucketOf(doc.status)].border }} onClick={() => openDocumentDetail(doc.id)}>
                              <Text size="sm" fw={600} c="gray.9" lineClamp={2} mb={6} style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{doc.title}</Text>
                              {column.id === 'list_pekerjaan' && (
                                <Box mb={6}>
                                  <Text
                                    component="span"
                                    style={{
                                      backgroundColor: badge.bg, color: badge.color, fontSize: 9,
                                      fontWeight: 700, padding: '3px 6px', borderRadius: 5, textTransform: 'uppercase', whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {badge.label}
                                  </Text>
                                </Box>
                              )}
                              <Flex align="center" justify="space-between" gap={8} wrap="nowrap">
                                <Group gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                  <IconShip size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
                                  <Text size="xs" c="gray.5" fw={500} truncate>{doc.nama_kapal || '-'}</Text>
                                </Group>
                                <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                                  <IconCalendar size={13} color="#9CA3AF" />
                                  <Text size="xs" c="gray.5" fw={500} style={{ whiteSpace: 'nowrap' }}>{dayjs(doc.document_date).format('DD MMM YYYY')}</Text>
                                </Group>
                              </Flex>
                            </Box>
                          );
                        })
                      )}
                    </Stack>
                    </ScrollArea.Autosize>
                  </Box>
                );
              })}
            </Flex>
          </ScrollArea>
        )}
      </Container>

      {/* ─── Drawer Detail Dokumen ─── */}
      <Drawer
        opened={detailOpened}
        onClose={closeOverlay}
        position="right"
        size="md"
        title={
          <Group gap={8}>
            <IconFileDescription size={20} color="#3B82F6" />
            <Text fw={700}>Detail Dokumen</Text>
          </Group>
        }
      >
        {isLoadingDetail ? (
          <Center h={300}><Loader /></Center>
        ) : selectedDoc ? (
          <Stack gap="md">
            <Box>
              <Text size="xs" c="dimmed">Judul</Text>
              <Text>{selectedDoc.title}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Status</Text>
              <Badge color={STATUS_BADGE[selectedDoc.status]?.color || 'gray'} mt={4}>
                {STATUS_BADGE[selectedDoc.status]?.label || selectedDoc.status}
              </Badge>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Nama Kapal (Lokasi)</Text>
              <Text>{selectedDoc.nama_kapal || '-'}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Tanggal Dokumen</Text>
              <Text>{dayjs(selectedDoc.document_date).format('DD MMM YYYY')}</Text>
            </Box>
            
            <Divider my="sm" />
            <Box>
              <Text fw={600} mb="xs">Evidences / Berkas</Text>
              {selectedDoc.uploads && selectedDoc.uploads.length > 0 ? (
                (() => {
                  const renderFile = (u: any, i: number) => (
                    <Paper key={i} p="xs" withBorder>
                      <Group justify="space-between" wrap="nowrap">
                        <Box style={{ minWidth: 0 }}>
                          <a href={`${import.meta.env.VITE_BASE_URL === '/' ? '' : (import.meta.env.VITE_BASE_URL || 'http://localhost:5000')}/${u.file_path?.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#228be6' }}>
                            <Text size="sm" fw={500} truncate style={{ maxWidth: 200 }}>{u.file_name}</Text>
                          </a>
                          <Text size="xs" c="dimmed">{dayjs(u.uploaded_at).format('DD MMM YYYY HH:mm')}</Text>
                        </Box>
                        <Group gap={6} wrap="nowrap">
                          <Badge size="xs" variant="light" color="gray">{getFileExt(u)}</Badge>
                          <Badge size="xs">{(u.file_size / 1024 / 1024).toFixed(2)} MB</Badge>
                        </Group>
                      </Group>
                    </Paper>
                  );
                  const snFiles = selectedDoc.uploads.filter((u: any) => isSnFile(u.file_name));
                  const otherFiles = selectedDoc.uploads.filter((u: any) => !isSnFile(u.file_name));
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
                })()
              ) : (
                <Text size="sm" c="dimmed">Belum ada berkas</Text>
              )}
            </Box>
          </Stack>
        ) : (
          <Text color="red">Gagal memuat data</Text>
        )}
      </Drawer>

      {/* ─── Bottom Sheet Filter (Mobile) ─── */}
      <Drawer
        opened={filterOpened}
        onClose={closeOverlay}
        position="bottom"
        size="auto"
        title={
          <Group gap={8}>
            <IconSearch size={20} color="#3B82F6" />
            <Text fw={700}>Cari & Filter</Text>
          </Group>
        }
        styles={{ content: { borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
      >
        <Stack gap="md" pb="xl" pt="sm">
          <TextInput
            label="Pencarian Judul"
            placeholder="Ketik judul dokumen..."
            leftSection={<IconSearch size={16} color="#9CA3AF" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="md"
          />
          <Select
            label="Filter Kapal / Lokasi"
            placeholder="Pilih lokasi kapal"
            leftSection={<IconShip size={16} color="#9CA3AF" />}
            data={vessels}
            value={filterVessel}
            onChange={setFilterVessel}
            clearable
            searchable
            size="md"
          />
          <Group grow mt="sm">
            <Button variant="light" color="gray" onClick={() => { setSearch(''); setFilterVessel(null); closeOverlay(); }}>
              Reset
            </Button>
            <Button color="blue" onClick={closeOverlay}>
              Terapkan
            </Button>
          </Group>
        </Stack>
      </Drawer>
    </Box>
  );
}
