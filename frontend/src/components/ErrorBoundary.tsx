import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Container, Title, Text, Button, Paper, Center } from '@mantine/core';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Center style={{ width: '100vw', height: '100vh', backgroundColor: '#f8f9fa' }}>
          <Container size="sm">
            <Paper shadow="md" p="xl" radius="md" style={{ textAlign: 'center' }}>
              <Title order={2} mb="md" c="red">Oops! Terjadi Kesalahan</Title>
              <Text size="md" mb="xl" c="dimmed">
                Aplikasi mengalami masalah saat memuat halaman ini.
              </Text>
              <Text size="xs" c="red" mb="xl" ta="left" style={{ backgroundColor: '#fff5f5', padding: '10px', borderRadius: '5px' }}>
                {this.state.error?.toString()}
              </Text>
              <Button onClick={() => window.location.reload()} size="md" color="blue">
                Muat Ulang Halaman
              </Button>
            </Paper>
          </Container>
        </Center>
      );
    }

    return this.props.children;
  }
}
