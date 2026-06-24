import { Paper, Title, Text, Center, ThemeIcon } from '@mantine/core';
import { IconHammer } from '@tabler/icons-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <Center mih={400}>
      <Paper p="xl" radius="lg" ta="center" shadow="sm" style={{ border: '1px solid #e9ecef' }}>
        <ThemeIcon size={60} radius="xl" variant="light" color="blue" mb="md" mx="auto">
          <IconHammer size={30} />
        </ThemeIcon>
        <Title order={3} fw={600} mb="xs">{title}</Title>
        <Text size="sm" c="dimmed" maw={300}>
          {description || 'Halaman ini sedang dalam pengembangan dan akan segera tersedia.'}
        </Text>
      </Paper>
    </Center>
  );
}
