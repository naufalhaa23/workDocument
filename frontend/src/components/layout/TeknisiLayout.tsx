import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  AppShell, Group, Text, Box, Avatar,
  Menu, ActionIcon, Indicator, UnstyledButton,
} from '@mantine/core';
import {
  IconHome, IconFileText, IconPackage, IconUser,
  IconBell, IconLogout, IconBuildingFactory2,
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/axios';
import { useState, useEffect } from 'react';
import { useSocketConnection } from '../../hooks/useSocket';

const MOBILE_NAV = [
  { icon: IconHome, label: 'Home', to: '/teknisi' },
  { icon: IconFileText, label: 'Dokumen', to: '/teknisi/dokumen' },
  { icon: IconPackage, label: 'Barang', to: '/teknisi/inventaris' },
  { icon: IconUser, label: 'Profil', to: '/teknisi/profil' },
];

export default function TeknisiLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const socket = useSocketConnection();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await api.get('/notifications');
        const count = res.data.filter((n: any) => !n.is_read).length;
        setUnreadCount(count);
      } catch (err) {
        // ignore
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    window.addEventListener('notifications-updated', fetchUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', fetchUnread);
    };
  }, []);

  // Real-time bell: backend emits notification:count on every new/read/delete
  useEffect(() => {
    if (!socket) return;
    const onCount = (data: any) => {
      if (typeof data?.unreadCount === 'number') setUnreadCount(data.unreadCount);
    };
    socket.on('notification:count', onCount);
    return () => { socket.off('notification:count', onCount); };
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 240,
        breakpoint: 'sm',
        collapsed: { mobile: true }
      }}
      footer={{ 
        height: 64
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
          paddingBottom: 80,
        },
      }}
    >
      {/* ─── MOBILE HEADER ─── */}
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Box
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #228be6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconBuildingFactory2 size={18} color="white" stroke={1.5} />
            </Box>
            <Text fw={700} size="md" c="#1a1b2e">
              Sistem Dokumen
            </Text>
          </Group>

          <Group gap="xs">
            {/* Notification Bell */}
            <Indicator color="red" size={10} offset={4} disabled={unreadCount === 0} label={unreadCount > 9 ? '9+' : unreadCount}>
              <ActionIcon
                variant="subtle" color="gray" size="lg" radius="md"
                onClick={() => navigate('/teknisi/notifikasi')}
              >
                <IconBell size={22} />
              </ActionIcon>
            </Indicator>

            <Menu shadow="md" width={180}>
              <Menu.Target>
                <Avatar
                  id="teknisi-avatar-menu"
                  size={30} radius="xl" color="blue"
                  style={{ cursor: 'pointer' }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Keluar
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ─── DESKTOP SIDEBAR ─── */}
      <AppShell.Navbar
        p="sm"
        style={{
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e9ecef',
        }}
      >
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box style={{ flex: 1 }}>
            {MOBILE_NAV.map((item) => {
              const isActive =
                item.to === '/teknisi'
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                  <UnstyledButton
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 4,
                      color: isActive ? '#228be6' : '#64748b',
                      backgroundColor: isActive ? '#e7f5ff' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 14,
                      transition: 'all .15s ease',
                    }}
                  >
                    <item.icon
                      size={20}
                      stroke={1.5}
                      style={{
                        marginRight: 12,
                        color: isActive ? '#228be6' : '#64748b',
                      }}
                    />
                    {item.label}
                  </UnstyledButton>
                </NavLink>
              );
            })}
          </Box>
        </Box>
      </AppShell.Navbar>

      {/* ─── MAIN CONTENT ─── */}
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      {/* ─── BOTTOM NAV BAR (Mobile) ─── */}
      <AppShell.Footer
        hiddenFrom="sm"
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e9ecef',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Group grow h="100%" gap={0}>
          {MOBILE_NAV.map((item) => {
            const isActive =
              item.to === '/teknisi'
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

            return (
              <NavLink key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <UnstyledButton
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '6px 0',
                    color: isActive ? '#228be6' : '#94a3b8',
                    transition: 'color .15s',
                  }}
                >
                  <item.icon
                    size={22}
                    stroke={isActive ? 2 : 1.5}
                  />
                  <Text
                    size="xs"
                    fw={isActive ? 600 : 400}
                    mt={2}
                  >
                    {item.label}
                  </Text>
                </UnstyledButton>
              </NavLink>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
