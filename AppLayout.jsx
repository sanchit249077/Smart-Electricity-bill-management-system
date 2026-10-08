import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, FileText, BarChart3, Sun, Plug, AlertTriangle,
  MessageSquare, Bell, Shield, Settings, User, Menu, X, Moon, Sun as SunIcon,
  LogOut, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'admin', 'staff'] },
  { to: '/bills', label: 'Bills & Payments', icon: FileText, roles: ['user', 'admin', 'staff'] },
  { to: '/analytics', label: 'Energy Analytics', icon: BarChart3, roles: ['user', 'admin'] },
  { to: '/solar', label: 'Solar Net Metering', icon: Sun, roles: ['user', 'admin'] },
  { to: '/appliances', label: 'Appliances', icon: Plug, roles: ['user'] },
  { to: '/outages', label: 'Power Outages', icon: Zap, roles: ['user', 'admin', 'staff'] },
  { to: '/complaints', label: 'Complaints', icon: MessageSquare, roles: ['user', 'admin', 'staff'] },
  { to: '/theft-alerts', label: 'Theft Alerts', icon: AlertTriangle, roles: ['admin', 'staff'] },
  { to: '/tariffs', label: 'Tariff Plans', icon: Settings, roles: ['admin'] },
  { to: '/admin', label: 'Admin Panel', icon: Shield, roles: ['admin', 'staff'] },
  { to: '/notifications', label: 'Notifications', icon: Bell, roles: ['user', 'admin', 'staff'] },
  { to: '/profile', label: 'Profile', icon: User, roles: ['user', 'admin', 'staff'] },
];

function NavLinks({ onNavigate }) {
  const { user } = useAuth();
  const role = user?.role || 'user';
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.filter((n) => n.roles.includes(role)).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )
          }
        >
          <item.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white shadow-md">
        <Zap className="h-5 w-5" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold">SmartPower</p>
        <p className="text-[10px] text-muted-foreground">Electricity Bill Mgmt</p>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
      .then((r) => active && setUnread(r.length))
      .catch(() => {});
    const unsub = base44.entities.Notification.subscribe(() => {
      base44.entities.Notification.filter({ user_id: user.id, read: false }, '-created_date', 50)
        .then((r) => active && setUnread(r.length))
        .catch(() => {});
    });
    return () => { active = false; unsub && unsub(); };
  }, [user]);

  const roleLabel = { admin: 'Administrator', staff: 'Dept. Staff', user: 'Customer' }[user?.role] || 'User';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            <span className="font-bold">SmartPower</span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggle}>
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </Button>
        </div>
        <SheetContent side="left" className="w-72 p-0">
          <Brand />
          <NavLinks onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 hidden items-center justify-between border-b border-border bg-card/80 px-6 py-3 backdrop-blur lg:flex">
          <div>
            <p className="text-sm font-medium">Welcome back, {user?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Button>
            <div className="ml-2 flex items-center gap-2 rounded-xl border border-border px-2.5 py-1.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {(user?.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <Button variant="ghost" size="icon" onClick={() => logout()} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile top actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-2 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')} className="relative">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => logout()}><LogOut className="h-5 w-5" /></Button>
        </div>

        <main className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}