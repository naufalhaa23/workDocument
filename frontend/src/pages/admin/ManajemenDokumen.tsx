import React, { useState, useEffect, useCallback } from 'react';
import {
  Paper, Title, Group, Button, TextInput, Select, Box,
  Badge, Text, ActionIcon, Menu, Modal, Stack,
  SegmentedControl, SimpleGrid, MultiSelect, Divider, Autocomplete, Popover
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { DataTable } from 'mantine-datatable';
import {
  IconPlus, IconSearch, IconDownload, IconDotsVertical,
  IconEdit, IconEye, IconTrash, IconFileText,
  IconFilter, IconUpload, IconPhoto, IconX
} from '@tabler/icons-react';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { modals } from '@mantine/modals';
import dayjs from 'dayjs';
import { api } from '../../lib/axios';
import { notifications } from '@mantine/notifications';
import { useDebouncedValue } from '@mantine/hooks';
import { useSocketConnection } from '../../hooks/useSocket';
import { getFileExt, isSnFile } from '../../lib/fileUtils';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  proses: { label: 'Proses', color: 'yellow' },
  menunggu_izin: { label: 'Menunggu Izin', color: 'orange' },
  upload_diizinkan: { label: 'Upload Diizinkan', color: 'teal' },
  draft_sn: { label: 'Draft SN', color: 'violet' },
  draft_pra: { label: 'Pra TTD', color: 'indigo' },
  assigned: { label: 'TTD (Assigned)', color: 'blue' },
  selesai: { label: 'Selesai', color: 'green' },
};

export default function ManajemenDokumen() {
  const socket = useSocketConnection();
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [teknisiOptions, setTeknisiOptions] = useState<{value: string, label: string}[]>([]);
  const [vesselOptions, setVesselOptions] = useState<string[]>([]);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 500);
  const [filterJenis, setFilterJenis] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterVessel, setFilterVessel] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [detailModalOpened, setDetailModalOpened] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const isSubmitting = React.useRef(false);

  // States for Admin Upload Evidence
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const handleAdminUpload = async () => {
    if (!selectedDoc || uploadFiles.length === 0) return;
    setUploadingEvidence(true);
    try {
      const formData = new FormData();
      formData.append('document_id', selectedDoc.id);
      uploadFiles.forEach((file) => formData.append('files', file));

      await api.post('/uploads/files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      notifications.show({ title: 'Sukses', message: 'Evidence berhasil di-upload', color: 'green' });
      setUploadFiles([]);
      // Refresh detail modal content
      openDetailModal(selectedDoc);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal upload evidence', color: 'red' });
    } finally {
      setUploadingEvidence(false);
    }
  };

  // Form state
  const [formType, setFormType] = useState('SP');
  const [formNumber, setFormNumber] = useState('');
  const [formDate, setFormDate] = useState<Date | null>(new Date());
  const [formTitle, setFormTitle] = useState('');
  const [formNamaKapal, setFormNamaKapal] = useState('');
  const [formTeknisi, setFormTeknisi] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState('proses');
  const [formDeadline, setFormDeadline] = useState<Date | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/documents', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: debouncedSearch || undefined,
          type: filterJenis || undefined,
          status: filterStatus || undefined,
          nama_kapal: filterVessel || undefined,
        }
      });
      setDocuments(res.data.data);
      setTotalRecords(res.data.total);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal mengambil data dokumen', color: 'red' });
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, filterJenis, filterStatus, filterVessel]);

  const fetchTeknisi = async () => {
    try {
      const res = await api.get('/users');
      const teknisi = res.data.filter((u: any) => u.role === 'teknisi');
      setTeknisiOptions(teknisi.map((u: any) => ({ value: String(u.id), label: u.username })));
    } catch (err) {
      console.error('Failed to fetch teknisi');
    }
  };

  const fetchVessels = async () => {
    try {
      const res = await api.get('/documents/vessels');
      setVesselOptions(res.data);
    } catch (err) {
      console.error('Failed to fetch vessels');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchTeknisi();
    fetchVessels();
  }, []);

  // Keep latest detail-modal state in a ref so the socket listener closure stays stable
  const detailStateRef = React.useRef<{ open: boolean; id: number | null }>({ open: false, id: null });
  useEffect(() => {
    detailStateRef.current = { open: detailModalOpened, id: selectedDoc?.id ?? null };
  }, [detailModalOpened, selectedDoc]);

  useEffect(() => {
    if (!socket) return;
    const refresh = (data?: any) => {
      fetchDocuments();
      // If the detail modal is open for the affected document, refresh its content too
      const { open, id } = detailStateRef.current;
      if (open && id && data && Number(data.documentId) === Number(id)) {
        refreshDetail(id);
      }
    };
    const handleDeleted = (data?: any) => {
      fetchDocuments();
      const { open, id } = detailStateRef.current;
      if (open && id && data && Number(data.documentId) === Number(id)) {
        setDetailModalOpened(false);
      }
    };
    socket.on('document:created', refresh);
    socket.on('document:updated', refresh);
    socket.on('document:deleted', handleDeleted);
    return () => {
      socket.off('document:created', refresh);
      socket.off('document:updated', refresh);
      socket.off('document:deleted', handleDeleted);
    };
  }, [socket, fetchDocuments]);

  const openAddModal = () => {
    setFormType('SP');
    setFormNumber(`SP-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`);
    setFormDate(new Date());
    setFormTitle('');
    setFormNamaKapal('');
    setFormTeknisi([]);
    setFormStatus('proses');
    setFormDeadline(null);
    setAddModalOpened(true);
  };

  const handleCreateDocument = async () => {
    if (!formTitle || !formNumber || !formDate) {
      return notifications.show({ title: 'Peringatan', message: 'Lengkapi semua field wajib', color: 'orange' });
    }
    
    try {
      await api.post('/documents', {
        document_type: formType,
        document_number: formNumber,
        // date-only field — send local calendar date to avoid UTC off-by-one
        document_date: formDate ? dayjs(formDate).format('YYYY-MM-DD') : undefined,
        title: formTitle,
        nama_kapal: formNamaKapal || undefined,
        assignees: formTeknisi,
      });
      notifications.show({ title: 'Sukses', message: 'Dokumen berhasil dibuat', color: 'green' });
      setAddModalOpened(false);
      fetchDocuments();
      fetchVessels(); // Update options if new vessel added
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal membuat dokumen', color: 'red' });
    }
  };

  const openEditModal = (doc: any) => {
    setSelectedDoc(doc);
    setFormType(doc.document_type);
    setFormNumber(doc.document_number);
    setFormDate(doc.document_date ? new Date(doc.document_date) : null);
    setFormTitle(doc.title);
    setFormNamaKapal(doc.nama_kapal || '');
    setFormTeknisi(doc.assignees ? doc.assignees.map((a: any) => String(a.user_id)) : []);
    setFormStatus(doc.status);
    setFormDeadline(doc.deadline_sn ? new Date(doc.deadline_sn) : null);
    setEditModalOpened(true);
  };

  const openDetailModal = async (doc: any) => {
    // Optionally fetch full document details
    try {
      const res = await api.get(`/documents/${doc.id}`);
      setSelectedDoc(res.data);
      setDetailModalOpened(true);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal mengambil detail dokumen', color: 'red' });
    }
  };

  // Re-fetch the currently open detail modal's content (e.g. when a teknisi uploads a new file)
  const refreshDetail = async (docId: number) => {
    try {
      const res = await api.get(`/documents/${docId}`);
      setSelectedDoc(res.data);
    } catch {
      /* ignore — list refresh still happens separately */
    }
  };

  const handleDeleteUpload = (uploadId: number) => {
    modals.openConfirmModal({
      title: 'Hapus File',
      centered: true,
      children: <Text size="sm">Yakin ingin menghapus file ini? File akan dihapus permanen dari server.</Text>,
      labels: { confirm: 'Hapus', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/uploads/files/${uploadId}`);
          notifications.show({ title: 'Sukses', message: 'File berhasil dihapus', color: 'green' });
          if (selectedDoc) refreshDetail(selectedDoc.id);
        } catch (err: any) {
          notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal menghapus file', color: 'red' });
        }
      },
    });
  };

  const renderUploadRow = (u: any) => (
    <Paper key={u.id} p="xs" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ minWidth: 0 }}>
          <a
            href={`${import.meta.env.VITE_BASE_URL === '/' ? '' : (import.meta.env.VITE_BASE_URL || 'http://localhost:5000')}/${u.file_path?.replace(/\\/g, '/')}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: '#228be6', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Text size="sm" fw={500} truncate style={{ maxWidth: 230 }}>{u.file_name}</Text>
          </a>
          <Text size="xs" c="dimmed" mt={2}>Diunggah: {dayjs(u.uploaded_at).format('DD MMM YYYY, HH:mm')}</Text>
          {u.notes && (
            <Text size="xs" c="dark" mt={4}>📝 Catatan: {u.notes}</Text>
          )}
        </Box>
        <Group gap="xs" wrap="nowrap">
          <Badge size="xs" variant="light" color="gray">{getFileExt(u)}</Badge>
          <Badge size="xs">{(u.file_size / 1024 / 1024).toFixed(2)} MB</Badge>
          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            onClick={() => handleDeleteUpload(u.id)}
            aria-label="Hapus file"
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>
    </Paper>
  );

  const handleUpdateDocument = async () => {
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setIsLoading(true);

    try {
      if (!selectedDoc || !selectedDoc.id) throw new Error('ID dokumen tidak valid');

      const newDeadline = formDeadline ? dayjs(formDeadline).toISOString() : null;

      // Single unified request – PUT handles data+assignees, then status/deadline if changed
      await api.put(`/documents/${selectedDoc.id}`, {
        document_type: formType,
        document_number: formNumber,
        // date-only field — send local calendar date to avoid UTC off-by-one
        document_date: formDate ? dayjs(formDate).format('YYYY-MM-DD') : undefined,
        title: formTitle,
        nama_kapal: formNamaKapal || undefined,
        assignees: formTeknisi,
        // Pass status & deadline so PUT can handle them in one transaction
        status: formStatus,
        deadline_sn: newDeadline,
      });

      notifications.show({ title: 'Sukses', message: 'Dokumen berhasil diupdate', color: 'green' });
      setEditModalOpened(false);
      fetchDocuments();
      fetchVessels(); // Update options if new vessel added
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data || err.message || 'Gagal update dokumen';
      notifications.show({ title: 'Error', message: String(errMsg), color: 'red' });
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleInlineStatusChange = async (docId: number, newStatus: string) => {
    setIsLoading(true);
    try {
      await api.patch(`/documents/${docId}/status`, { status: newStatus });
      notifications.show({ title: 'Sukses', message: 'Status berhasil diperbarui', color: 'green' });
      fetchDocuments();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal mengubah status', color: 'red' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    modals.openConfirmModal({
      title: 'Hapus Dokumen',
      centered: true,
      children: (
        <Text size="sm">
          Apakah Anda yakin ingin menghapus dokumen ini? Data tidak dapat dikembalikan.
        </Text>
      ),
      labels: { confirm: 'Hapus', cancel: 'Batal' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/documents/${id}`);
          notifications.show({ title: 'Sukses', message: 'Dokumen dihapus', color: 'green' });
          fetchDocuments();
        } catch (err: any) {
          notifications.show({ title: 'Error', message: err.response?.data?.message || 'Akses ditolak', color: 'red' });
        }
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      const res = await api.get('/documents/export', {
        params: { search: debouncedSearch || undefined, type: filterJenis || undefined, status: filterStatus || undefined, nama_kapal: filterVessel || undefined }
      });
      const dataToExport = res.data.map((d: any, i: number) => ({
        No: i + 1,
        'No. Dokumen': d.document_number,
        Tanggal: dayjs(d.document_date).format('DD MMM YYYY'),
        Jenis: d.document_type,
        'Judul Dokumen': d.title,
        'Nama Kapal': d.nama_kapal || '-',
        Teknisi: d.assignees?.map((a: any) => a.user.username).join(', ') || '-',
        Status: STATUS_CONFIG[d.status]?.label || d.status,
      }));

      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dokumen');
      XLSX.writeFile(wb, `dokumen_export_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Gagal export data', color: 'red' });
    }
  };

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Title order={2} fw={700}>Manajemen Dokumen</Title>
        <Group gap="sm">
          <Button
            id="btn-export-excel"
            variant="light"
            color="green"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            id="btn-tambah-dokumen"
            leftSection={<IconPlus size={16} />}
            onClick={openAddModal}
          >
            Tambah Dokumen
          </Button>
        </Group>
      </Group>

      {/* Filters */}
      <Paper p="md" radius="md" mb="md" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <Group>
          <TextInput
            id="search-dokumen"
            placeholder="Cari nomor, judul, atau teknisi..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
            style={{ flexGrow: 1 }}
          />
          <Popover width={300} position="bottom-end" withArrow shadow="md">
            <Popover.Target>
              <Button variant="light" leftSection={<IconFilter size={16} />}>
                Filter Lanjutan
                {(filterJenis || filterStatus || filterVessel) && (
                  <Badge size="xs" color="blue" circle ml={8}>
                    {[filterJenis, filterStatus, filterVessel].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="sm">
                <Text size="sm" fw={500}>Filter Dokumen</Text>
                <Select
                  label="Jenis Dokumen"
                  placeholder="Semua Jenis"
                  data={[
                    { value: 'SP', label: 'SP (Surat Perintah)' },
                    { value: 'SPMK', label: 'SPMK (Surat Perintah Mulai Kerja)' },
                  ]}
                  value={filterJenis}
                  onChange={(v) => { setFilterJenis(v); setPage(1); }}
                  clearable
                />
                <Select
                  label="Status"
                  placeholder="Semua Status"
                  data={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
                  value={filterStatus}
                  onChange={(v) => { setFilterStatus(v); setPage(1); }}
                  clearable
                />
                <Select
                  label="Nama Kapal"
                  placeholder="Semua Kapal"
                  data={vesselOptions}
                  value={filterVessel}
                  onChange={(v) => { setFilterVessel(v); setPage(1); }}
                  clearable
                  searchable
                />
                {(filterJenis || filterStatus || filterVessel) && (
                  <Button 
                    variant="subtle" 
                    color="red" 
                    size="xs" 
                    fullWidth 
                    onClick={() => {
                      setFilterJenis(null);
                      setFilterStatus(null);
                      setFilterVessel(null);
                      setPage(1);
                    }}
                  >
                    Reset Filter
                  </Button>
                )}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </Paper>

      {/* DataTable */}
      <Paper radius="md" shadow="sm" style={{ border: '1px solid #e9ecef', overflow: 'hidden' }}>
        <DataTable
          withTableBorder={false}
          borderRadius="md"
          noRecordsText="Belum ada dokumen yang ditemukan"
          noRecordsIcon={<IconFileText size={48} />}
          striped
          highlightOnHover
          minHeight={300}
          scrollAreaProps={{ type: 'always', offsetScrollbars: true }}
          fetching={isLoading}
          records={documents}
          totalRecords={totalRecords}
          recordsPerPage={PAGE_SIZE}
          page={page}
          onPageChange={setPage}
          onRowDoubleClick={({ record }) => openDetailModal(record)}
          columns={[
            {
              accessor: 'index',
              title: 'No',
              width: 50,
              textAlign: 'center',
              render: (_, index) => (page - 1) * PAGE_SIZE + index + 1,
            },
            {
              accessor: 'document_number',
              title: 'No. Dokumen',
              width: 160,
              render: (record) => (
                <Text size="sm" fw={600}>{record.document_number}</Text>
              ),
            },
            {
              accessor: 'document_date',
              title: 'Tanggal',
              width: 120,
              render: (record) => (
                <Text size="sm">{record.document_date ? dayjs(record.document_date).format('DD MMM YYYY') : '-'}</Text>
              ),
            },
            {
              accessor: 'document_type',
              title: 'Jenis',
              width: 80,
              textAlign: 'center',
              render: (record) => (
                <Badge
                  variant="outline"
                  color={record.document_type === 'SP' ? 'blue' : 'grape'}
                  size="sm"
                >
                  {record.document_type}
                </Badge>
              ),
            },
            {
              accessor: 'title',
              title: 'Judul Dokumen',
            },
            {
              accessor: 'nama_kapal',
              title: 'Nama Kapal',
              width: 140,
              render: (record) => (
                <Text size="sm">{record.nama_kapal || '-'}</Text>
              )
            },
            {
              accessor: 'teknisi',
              title: 'Teknisi',
              width: 140,
              render: (record) => record.assignees && record.assignees.length > 0 
                ? record.assignees.map((a: any) => a.user.username).join(', ') 
                : '-',
            },
            {
              accessor: 'status',
              title: 'Status',
              width: 160,
              render: (record) => (
                <Select
                  size="xs"
                  data={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                    // Workflow-only statuses can't be set manually from the table
                    disabled: k === 'menunggu_izin' || k === 'upload_diizinkan',
                  }))}
                  value={record.status}
                  onChange={(val) => val && handleInlineStatusChange(record.id, val)}
                  onClick={(e) => e.stopPropagation()}
                  styles={(theme) => ({
                    input: {
                      backgroundColor: theme.colors[STATUS_CONFIG[record.status]?.color || 'gray'][0],
                      color: theme.colors[STATUS_CONFIG[record.status]?.color || 'gray'][9],
                      fontWeight: 600,
                      border: 'none',
                    }
                  })}
                />
              ),
            },
            {
              accessor: 'aksi',
              title: 'Aksi',
              width: 60,
              textAlign: 'center',
              render: (record) => (
                <Menu shadow="md" width={180} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="sm" onClick={(e) => e.stopPropagation()}>
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEye size={14} />} onClick={(e) => { e.stopPropagation(); openDetailModal(record); }}>
                      Lihat Detail
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconEdit size={14} />}
                      onClick={(e) => { e.stopPropagation(); openEditModal(record); }}
                    >
                      Edit Dokumen
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}>
                      Hapus
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ),
            },
          ]}
        />
      </Paper>

      {/* ─── MODAL: DETAIL DOKUMEN ─── */}
      <Modal
        opened={detailModalOpened}
        onClose={() => setDetailModalOpened(false)}
        title={
          <Group gap="xs">
            <IconFileText size={20} />
            <Text fw={600}>Detail Dokumen — {selectedDoc?.document_number}</Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        {selectedDoc && (
          <Stack gap="sm">
            <SimpleGrid cols={2}>
              <Box>
                <Text size="xs" c="dimmed">Jenis & Nomor</Text>
                <Text fw={600}>{selectedDoc.document_type} - {selectedDoc.document_number}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Status Saat Ini</Text>
                <Badge color={STATUS_CONFIG[selectedDoc.status]?.color || 'gray'}>
                  {STATUS_CONFIG[selectedDoc.status]?.label || selectedDoc.status}
                </Badge>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Judul</Text>
                <Text>{selectedDoc.title}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Tanggal Dokumen</Text>
                <Text>{dayjs(selectedDoc.document_date).format('DD MMMM YYYY')}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Nama Kapal (Lokasi)</Text>
                <Text>{selectedDoc.nama_kapal || '-'}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Teknisi Ditugaskan</Text>
                <Text>{selectedDoc.assignees && selectedDoc.assignees.length > 0 ? selectedDoc.assignees.map((a: any) => a.user.username).join(', ') : '-'}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Deadline SN</Text>
                <Text>{selectedDoc.deadline_sn ? dayjs(selectedDoc.deadline_sn).format('DD MMM YYYY') : '-'}</Text>
              </Box>
            </SimpleGrid>

            <Divider my="sm" />
            <Text fw={600}>Riwayat Upload Evidence</Text>
            {selectedDoc.uploads && selectedDoc.uploads.length > 0 ? (
              (() => {
                const snFiles = selectedDoc.uploads.filter((u: any) => isSnFile(u.file_name));
                const otherFiles = selectedDoc.uploads.filter((u: any) => !isSnFile(u.file_name));
                return (
                  <Stack gap="md">
                    {snFiles.length > 0 && (
                      <Box>
                        <Text size="xs" fw={700} c="violet" tt="uppercase" mb={6}>📄 Dokumen SN</Text>
                        <Stack gap="xs">{snFiles.map(renderUploadRow)}</Stack>
                      </Box>
                    )}
                    {otherFiles.length > 0 && (
                      <Box>
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={6}>Dokumen Lain (SP/SPMK/FPP)</Text>
                        <Stack gap="xs">{otherFiles.map(renderUploadRow)}</Stack>
                      </Box>
                    )}
                  </Stack>
                );
              })()
            ) : (
              <Text size="sm" c="dimmed">Belum ada file evidence yang di-upload.</Text>
            )}

            <Divider my="sm" />
            <Text fw={600}>Upload Tambahan (Admin/SA)</Text>
            <Dropzone
              onDrop={(acceptedFiles) => setUploadFiles((prev) => [...prev, ...acceptedFiles])}
              onReject={() => notifications.show({ title: 'Error', message: 'File tidak valid atau terlalu besar', color: 'red' })}
              maxSize={10 * 1024 ** 2}
              accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.pdf, MIME_TYPES.doc, MIME_TYPES.docx]}
            >
              <Group justify="center" gap="xl" style={{ minHeight: 120, pointerEvents: 'none' }}>
                <Dropzone.Accept>
                  <IconUpload size={40} color="blue" stroke={1.5} />
                </Dropzone.Accept>
                <Dropzone.Reject>
                  <IconX size={40} color="red" stroke={1.5} />
                </Dropzone.Reject>
                <Dropzone.Idle>
                  <IconPhoto size={40} color="gray" stroke={1.5} />
                </Dropzone.Idle>
                <Box>
                  <Text size="sm" inline>Drag gambar/pdf ke sini atau klik untuk memilih file</Text>
                  <Text size="xs" c="dimmed" inline mt={7}>Max ukuran file: 10MB</Text>
                </Box>
              </Group>
            </Dropzone>

            {uploadFiles.length > 0 && (
              <Stack gap="xs" mt="sm">
                <Text size="sm" fw={500}>File yang akan di-upload:</Text>
                {uploadFiles.map((f, i) => (
                  <Group key={i} justify="space-between" bg="gray.0" p="xs" style={{ borderRadius: 4 }}>
                    <Text size="sm" truncate style={{ flex: 1 }}>{f.name}</Text>
                    <ActionIcon color="red" onClick={() => setUploadFiles((prev) => prev.filter((_, idx) => idx !== i))}>
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button loading={uploadingEvidence} onClick={handleAdminUpload} mt="md">
                  Upload Evidence
                </Button>
              </Stack>
            )}
          </Stack>
        )}
      </Modal>

      {/* ─── MODAL: TAMBAH DOKUMEN ─── */}
      <Modal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        title={
          <Group gap="xs">
            <IconFileText size={20} />
            <Text fw={600}>Tambah Dokumen Baru</Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={500} mb={6}>Jenis Dokumen *</Text>
            <SegmentedControl
              fullWidth
              value={formType}
              onChange={(v) => {
                setFormType(v);
                setFormNumber(`${v}-2026-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`);
              }}
              data={[
                { value: 'SP', label: 'SP (Surat Perintah)' },
                { value: 'SPMK', label: 'SPMK (Surat Perintah Mulai Kerja)' },
              ]}
            />
          </Box>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Nomor Dokumen *"
              value={formNumber}
              onChange={(e) => setFormNumber(e.currentTarget.value)}
              description="Auto-generated berdasarkan jenis, bisa diubah manual"
            />
            <DatePickerInput
              label="Tanggal Dokumen *"
              value={formDate}
              onChange={(v) => setFormDate(v as Date | null)}
              valueFormat="DD MMMM YYYY"
            />
          </SimpleGrid>

          <TextInput
            label="Judul Dokumen *"
            placeholder="Contoh: Laporan Inspeksi Mesin CNC #14"
            value={formTitle}
            onChange={(e) => setFormTitle(e.currentTarget.value)}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Autocomplete
              label="Nama Kapal (Lokasi Kerja)"
              placeholder="Ketik atau pilih nama kapal..."
              data={vesselOptions}
              value={formNamaKapal}
              onChange={setFormNamaKapal}
            />
            <MultiSelect
              label="Assign ke Teknisi (Opsional)"
              placeholder="Pilih satu atau lebih teknisi..."
              data={teknisiOptions}
              value={formTeknisi}
              onChange={setFormTeknisi}
              searchable
              clearable
            />
          </SimpleGrid>

          <Box>
            <Text size="sm" fw={500} mb={4}>Status Awal</Text>
            <Badge color="yellow" variant="light" size="lg">🟡 Proses</Badge>
            <Text size="xs" c="dimmed" mt={4}>Default, tidak bisa diubah saat create</Text>
          </Box>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Batal</Button>
            <Button onClick={handleCreateDocument} loading={isLoading}>✅ Simpan Dokumen</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ─── MODAL: EDIT DOKUMEN ─── */}
      <Modal
        opened={editModalOpened}
        onClose={() => setEditModalOpened(false)}
        title={
          <Group gap="xs">
            <IconEdit size={20} />
            <Text fw={600}>Edit Dokumen — {selectedDoc?.document_number}</Text>
          </Group>
        }
        size="lg"
        radius="md"
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" fw={500} mb={6}>Jenis Dokumen *</Text>
            <SegmentedControl
              fullWidth
              value={formType}
              onChange={setFormType}
              data={[
                { value: 'SP', label: 'SP (Surat Perintah)' },
                { value: 'SPMK', label: 'SPMK (Surat Perintah Mulai Kerja)' },
              ]}
            />
          </Box>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Nomor Dokumen *"
              value={formNumber}
              onChange={(e) => setFormNumber(e.currentTarget.value)}
            />
            <DatePickerInput
              label="Tanggal Dokumen *"
              value={formDate}
              onChange={(v) => setFormDate(v as Date | null)}
              valueFormat="DD MMMM YYYY"
            />
          </SimpleGrid>

          <TextInput
            label="Judul Dokumen *"
            value={formTitle}
            onChange={(e) => setFormTitle(e.currentTarget.value)}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Autocomplete
              label="Nama Kapal (Lokasi Kerja)"
              placeholder="Ketik atau pilih nama kapal..."
              data={vesselOptions}
              value={formNamaKapal}
              onChange={setFormNamaKapal}
            />
            <MultiSelect
              label="Assign ke Teknisi (Opsional)"
              placeholder="Pilih satu atau lebih teknisi..."
              data={teknisiOptions}
              value={formTeknisi}
              onChange={setFormTeknisi}
              searchable
              clearable
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Ubah Status"
              data={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
                value: k,
                label: v.label,
                // Workflow-only statuses can't be set manually
                disabled: k === 'menunggu_izin' || k === 'upload_diizinkan',
              }))}
              value={formStatus}
              onChange={(v) => setFormStatus(v || 'proses')}
            />
            <DatePickerInput
              label="Set Deadline SN"
              value={formDeadline}
              onChange={(v) => setFormDeadline(v as Date | null)}
              valueFormat="DD MMM YYYY"
              clearable
              description={formStatus === 'draft_sn' ? '⚠️ Wajib diisi' : ''}
            />
          </SimpleGrid>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setEditModalOpened(false)}>Batal</Button>
            <Button onClick={handleUpdateDocument} loading={isLoading}>💾 Simpan Perubahan</Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
