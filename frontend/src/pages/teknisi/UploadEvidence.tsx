import { useState } from 'react';
import {
  Box, Title, Text, Paper, Group, Button, Stack, Textarea, Badge,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconX, IconArrowLeft, IconFile } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '../../lib/axios';

export default function UploadEvidence() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    if (files.length === 0) {
      notifications.show({ title: 'Error', message: 'Pilih minimal 1 file untuk di-upload', color: 'red' });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document_id', id as string);
      formData.append('notes', notes);
      
      files.forEach((file) => {
        formData.append('files', file);
      });

      await api.post('/uploads/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Notify or just rely on backend to log.
      // (Admin will review and change status)

      notifications.show({ title: 'Berhasil!', message: 'File evidence berhasil di-upload', color: 'green' });
      navigate(`/teknisi/dokumen/${id}`);
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.message || 'Gagal upload', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(-1)} mb="md" px={0}>
        Kembali
      </Button>

      <Title order={3} fw={700} mb="xs">Upload Evidence</Title>
      <Text size="sm" c="dimmed" mb="lg">Upload foto atau dokumen bukti kerja lapangan</Text>

      <Paper p="lg" radius="lg" shadow="sm" mb="md" style={{ border: '1px solid #e9ecef' }}>
        <Dropzone
          onDrop={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
          maxSize={10 * 1024 * 1024}
          accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.pdf, MIME_TYPES.doc, MIME_TYPES.docx]}
          radius="md"
          loading={uploading}
          styles={{
            root: {
              minHeight: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderColor: '#dee2e6',
            },
          }}
        >
          <Group justify="center" gap="xl" style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept><IconUpload size={40} color="#228be6" stroke={1.5} /></Dropzone.Accept>
            <Dropzone.Reject><IconX size={40} color="#e03131" stroke={1.5} /></Dropzone.Reject>
            <Dropzone.Idle><IconPhoto size={40} color="#868e96" stroke={1.5} /></Dropzone.Idle>
            <Box ta="center">
              <Text size="md" fw={500}>Tap atau drag file ke sini</Text>
              <Text size="xs" c="dimmed" mt={4}>Foto (PNG, JPG) atau dokumen (PDF, DOC). Maks 10MB.</Text>
            </Box>
          </Group>
        </Dropzone>

        {/* File list */}
        {files.length > 0 && (
          <Stack gap="xs" mt="md">
            <Text size="sm" fw={500}>{files.length} file dipilih</Text>
            {files.map((f, i) => (
              <Paper key={i} p="xs" radius="md" bg="gray.0">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconFile size={16} />
                    <Text size="sm" truncate style={{ maxWidth: 200 }}>{f.name}</Text>
                    <Badge size="xs" variant="light" color="gray">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </Badge>
                  </Group>
                  <Button
                    variant="subtle" color="red" size="xs" p={4}
                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                  >
                    <IconX size={14} />
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper p="lg" radius="lg" shadow="sm" mb="md" style={{ border: '1px solid #e9ecef' }}>
        <Textarea
          label="Catatan (opsional)"
          placeholder="Keterangan tambahan tentang file yang di-upload..."
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
      </Paper>

      <Button
        fullWidth size="lg" radius="md" color="green"
        leftSection={<IconUpload size={20} />}
        onClick={handleSubmit}
        loading={uploading}
        styles={{ root: { height: 52, fontSize: 16, fontWeight: 600 } }}
      >
        ✅ Upload Evidence
      </Button>
    </Box>
  );
}
