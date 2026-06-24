import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  AppShell, Group, Text, UnstyledButton, Box, Avatar,
  Menu, Burger, Indicator, Tooltip, ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard, IconFileText, IconCheckupList,
  IconPackage, IconPackages, IconUsers,
  IconBell, IconLogout, IconChevronDown, IconUser,
  IconBuildingFactory2, IconSettings,
  IconBrandTelegram, IconListDetails
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/axios';

interface NavItem {
  icon: typeof IconDashboard;
  label: string;
  to: string;
  color?: string;
}

const ADMIN_NAV: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', to: '/admin' },
  { icon: IconFileText, label: 'Manajemen Dokumen', to: '/admin/dokumen' },
  { icon: IconCheckupList, label: 'Persetujuan', to: '/admin/approvals' },
  { icon: IconPackage, label: 'Master Inventaris', to: '/admin/inventaris' },
  { icon: IconPackages, label: 'Permintaan Barang', to: '/admin/inventaris/requests' },
  { icon: IconUsers, label: 'Manajemen User', to: '/admin/users' },
  { icon: IconBrandTelegram, label: 'Pengaturan Telegram', to: '/admin/telegram-settings' },
  { icon: IconListDetails, label: 'Log Telegram', to: '/admin/telegram-logs' },
];

const SUPERADMIN_NAV: NavItem[] = [
  { icon: IconDashboard, label: 'Dashboard', to: '/superadmin' },
  { icon: IconFileText, label: 'Manajemen Dokumen', to: '/superadmin/dokumen' },
  { icon: IconCheckupList, label: 'Persetujuan', to: '/superadmin/approvals' },
  { icon: IconPackage, label: 'Master Inventaris', to: '/superadmin/inventaris' },
  { icon: IconPackages, label: 'Permintaan Barang', to: '/superadmin/inventaris/requests' },
  { icon: IconUsers, label: 'Manajemen User', to: '/superadmin/users' },
  { icon: IconBrandTelegram, label: 'Pengaturan Telegram', to: '/superadmin/telegram-settings' },
  { icon: IconListDetails, label: 'Log Telegram', to: '/superadmin/telegram-logs' },
  { icon: IconSettings, label: 'Pengaturan Sistem', to: '/superadmin/settings' },
];

export default function AdminLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = user?.role === 'superadmin' ? SUPERADMIN_NAV : ADMIN_NAV;
  const [unreadCount, setUnreadCount] = useState(0);

  const mobileNavItems = [
    { icon: IconDashboard, label: 'Home', to: user?.role === 'superadmin' ? '/superadmin' : '/admin' },
    { icon: IconFileText, label: 'Dokumen', to: user?.role === 'superadmin' ? '/superadmin/dokumen' : '/admin/dokumen' },
    { icon: IconCheckupList, label: 'Approval', to: user?.role === 'superadmin' ? '/superadmin/approvals' : '/admin/approvals' },
    { icon: IconUsers, label: 'Users', to: user?.role === 'superadmin' ? '/superadmin/users' : '/admin/users' },
  ];

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
    
    // Poll every 30s or rely on socket, but simple poll
    const interval = setInterval(fetchUnread, 30000);
    window.addEventListener('notifications-updated', fetchUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', fetchUnread);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          backgroundColor: '#f8f9fa',
          minHeight: '100vh',
        },
      }}
    >
      {/* ─── HEADER ─── */}
      <AppShell.Header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e9ecef',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Box
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #228be6, #6366f1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <IconBuildingFactory2 size={20} color="white" stroke={1.5} />
            </Box>
            <Text fw={700} size="lg" c="#1a1b2e" visibleFrom="sm">
              Sistem Manajemen
            </Text>
          </Group>

          <Group gap="sm">
            {/* Notification Bell */}
            <Tooltip label="Notifikasi" withArrow>
              <Indicator color="red" size={10} offset={4} disabled={unreadCount === 0} label={unreadCount > 9 ? '9+' : unreadCount}>
                <ActionIcon
                  id="header-notification-bell"
                  variant="subtle" color="gray" size="lg" radius="md"
                  onClick={() => navigate(`/${user?.role}/notifikasi`)}
                >
                  <IconBell size={22} />
                </ActionIcon>
              </Indicator>
            </Tooltip>

            {/* User Menu */}
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton
                  id="header-user-menu"
                  style={{
                    padding: '4px 12px', borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background .15s',
                  }}
                >
                  <Avatar size={32} radius="xl" color="blue">
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box visibleFrom="sm">
                    <Text size="sm" fw={500} lh={1.2}>
                      {user?.username}
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.2} tt="capitalize">
                      {user?.role}
                    </Text>
                  </Box>
                  <IconChevronDown size={14} style={{ opacity: 0.5 }} />
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Akun</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  onClick={() => navigate(`/${user?.role}/profil`)}
                >
                  Profil Anda
                </Menu.Item>
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

      {/* ─── SIDEBAR ─── */}
      <AppShell.Navbar
        p="sm"
        style={{
          backgroundColor: '#1a1b2e',
          borderRight: 'none',
        }}
      >
        <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Nav items */}
          <Box style={{ flex: 1 }}>
            {navItems.map((item) => {
              const isActive =
                item.to === `/${user?.role}`
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink 
                  key={item.to} 
                  to={item.to} 
                  style={{ textDecoration: 'none' }}
                  onClick={() => { if (opened) toggle(); }}
                >
                  <UnstyledButton
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      marginBottom: 4,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      backgroundColor: isActive ? '#2d3154' : 'transparent',
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

          {/* Footer */}
          <Box
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              paddingTop: 12,
            }}
          >
            <Text size="xs" c="dimmed" ta="center">
              © 2026 Sistem Manajemen
            </Text>
          </Box>
        </Box>
      </AppShell.Navbar>

      {/* ─── MAIN CONTENT ─── */}
      <AppShell.Main pb={{ base: 80, sm: 0 }}>
        <Outlet />
      </AppShell.Main>

      {/* ─── BOTTOM NAV BAR (Mobile) ─── */}
      <AppShell.Footer
        hiddenFrom="sm"
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e9ecef',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
          height: 60,
        }}
      >
        <Group grow h="100%" gap={0}>
          {mobileNavItems.map((item) => {
            const isActive =
              item.to === '/admin' || item.to === '/superadmin'
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
                  <item.icon size={22} stroke={isActive ? 2 : 1.5} />
                  <Text size="xs" fw={isActive ? 600 : 400} mt={2}>{item.label}</Text>
                </UnstyledButton>
              </NavLink>
            );
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  );
}
