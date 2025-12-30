import React from 'react'
import { Link, useLocation, Outlet, useParams } from 'react-router-dom'
import { 
  BarChart3, 
  PlusCircle, 
  Receipt, 
  Wallet,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Menu,
  Bell,
  Users,
  Building2,
  Landmark,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { useMasterConfigs } from '@/hooks/useMasterConfigs'

export const Layout: React.FC = () => {
  const { orgSlug } = useParams()
  const location = useLocation()
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-collapsed') === 'true'
    }
    return false
  })

  // Update localStorage when state changes
  React.useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const { user, profile, signOut } = useAuth()
  
  // Pre-fetch and cache master configs
  useMasterConfigs()

  // Get user initials from email or name
  const getUserInitials = () => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      }
      return profile.full_name.substring(0, 2).toUpperCase()
    }
    if (!user) return 'U'
    const email = user.email || ''
    const parts = email.split('@')[0].split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    console.log('Button clicked: Sign Out')
    await signOut()
  }

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, href: `/${orgSlug}/dashboard` },
    { label: 'Projects', icon: FolderKanban, href: `/${orgSlug}/projects` },
    { label: 'Invoices', icon: FileText, href: `/${orgSlug}/invoices` },
    { label: 'Income', icon: Wallet, href: `/${orgSlug}/income` },
    { label: 'Quick Add', icon: PlusCircle, href: `/${orgSlug}/add`, primary: true },
    { label: 'Expenses', icon: Receipt, href: `/${orgSlug}/expenses` },
    { label: 'Customers', icon: Users, href: `/${orgSlug}/customers` },
    { label: 'Vendors', icon: Building2, href: `/${orgSlug}/vendors` },
    { label: 'Bank Accounts', icon: Landmark, href: `/${orgSlug}/bank-accounts` },
    { 
      label: 'Stats', 
      icon: BarChart3, 
      children: [
        { label: 'GST Summary', href: `/${orgSlug}/stats/gst` },
        { label: 'Bank Statement', href: `/${orgSlug}/stats/bank` },
      ]
    },
  ]

  const mobileBottomItems = ['Home', 'Projects', 'Quick Add']
  const moreItems = navItems.filter(item => !mobileBottomItems.includes(item.label) && !item.primary)

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm transition-all duration-300",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-md md:max-w-6xl">
          <div className="flex items-center gap-2">
            <Link to={`/${orgSlug}/dashboard`} className={cn("flex items-center gap-2", !isSidebarCollapsed && "md:ml-4")}>
              <img 
                src="/Suryasathi_logo_hz.svg" 
                alt={`${profile?.organization?.name || 'Company'} Logo`} 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
            </Button>
            <ModeToggle />
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20">
                  <span className="text-sm font-semibold text-primary">
                    {getUserInitials()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    {profile?.organization && (
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-primary mt-1">
                        {profile.organization.name}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 pb-24 md:pb-8 pt-4 transition-all duration-300",
        isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
      )}>
        <div className="container px-4 mx-auto max-w-md md:max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 border-r bg-white dark:bg-slate-900 overflow-y-auto transition-all duration-300 z-50",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-16 flex items-center px-4 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-9 w-9 text-muted-foreground hover:text-primary transition-all",
              isSidebarCollapsed ? "mx-auto" : "ml-auto"
            )}
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
        </div>
        <nav className="flex flex-col flex-1 w-full p-4 gap-2">
          {navItems.map((item) => {
            if (item.primary) return null;
            
            const isActive = location.pathname === item.href || (item.children?.some(child => location.pathname === child.href))
            const Icon = item.icon
            const hasChildren = !!item.children

            if (hasChildren) {
              return (
                <div key={item.label} className="flex flex-col gap-1">
                  <div
                    className={cn(
                      "flex items-center rounded-xl text-sm font-medium transition-all cursor-default",
                      isActive 
                        ? "text-primary bg-primary/5" 
                        : "text-muted-foreground",
                      isSidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "justify-between px-4 py-3"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      {!isSidebarCollapsed && item.label}
                    </div>
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex flex-col gap-1 ml-9 border-l border-border pl-2">
                      {item.children?.map((child) => {
                        const isChildActive = location.pathname === child.href
                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={cn(
                              "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                              isChildActive
                                ? "bg-primary/10 text-primary dark:bg-primary/20"
                                : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
                            )}
                          >
                            {child.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <Link
                key={item.href || item.label}
                to={item.href || `/${orgSlug}`}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary dark:bg-primary/20" 
                    : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/50",
                  isSidebarCollapsed ? "justify-center px-0 h-11 w-11 mx-auto" : "gap-3 px-4 py-3"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {!isSidebarCollapsed && item.label}
              </Link>
            )
          })}
          
          <div className="mt-auto pt-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className={cn(
                    "w-full flex items-center gap-3 rounded-2xl text-sm font-medium bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all border-none",
                    isSidebarCollapsed ? "px-0 justify-center h-12 w-12 mx-auto" : "px-4 py-6 justify-start"
                  )}
                >
                  <PlusCircle className="h-5 w-5 shrink-0" />
                  {!isSidebarCollapsed && "Quick Add"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
                <DropdownMenuItem asChild>
                  <Link to={`/${orgSlug}/customers/new`} className="cursor-pointer w-full flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>New Customer</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/${orgSlug}/vendors/new`} className="cursor-pointer w-full flex items-center">
                    <Building2 className="mr-2 h-4 w-4" />
                    <span>New Vendor</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/${orgSlug}/bank-accounts/new`} className="cursor-pointer w-full flex items-center">
                    <Landmark className="mr-2 h-4 w-4" />
                    <span>New Bank Account</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 bg-background border-t md:hidden flex items-center justify-around px-1 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        {navItems.filter(item => mobileBottomItems.includes(item.label) || item.primary).map((item) => {
          const isActive = location.pathname === item.href
          const Icon = item.icon

          if (item.primary) {
            return (
              <DropdownMenu key={item.href}>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="relative -top-6 bg-primary text-primary-foreground h-14 w-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-all border-4 border-background outline-none"
                  >
                    <Icon className="h-6 w-6" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="w-56 mb-4">
                  <DropdownMenuItem asChild>
                    <Link to={`/${orgSlug}/customers/new`} className="cursor-pointer w-full flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      <span>New Customer</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/${orgSlug}/vendors/new`} className="cursor-pointer w-full flex items-center">
                      <Building2 className="mr-2 h-4 w-4" />
                      <span>New Vendor</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/${orgSlug}/bank-accounts/new`} className="cursor-pointer w-full flex items-center">
                      <Landmark className="mr-2 h-4 w-4" />
                      <span>New Bank Account</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }

          return (
            <Link
              key={item.href || item.label}
              to={item.href || `/${orgSlug}`}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[50px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "animate-in fade-in zoom-in duration-300")} />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}

        {/* More Button */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center gap-1 min-w-[50px] text-muted-foreground hover:text-foreground">
              <Menu className="h-5 w-5" />
              <span className="text-[9px] font-medium leading-none">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[32px] p-6 border-t">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-left text-sm font-semibold text-muted-foreground">More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-4">
              {moreItems.map((item) => (
                <React.Fragment key={item.label}>
                  {item.children ? (
                    item.children.map((child) => (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl gap-2 transition-all active:scale-95",
                          location.pathname === child.href 
                            ? "bg-primary/10 text-primary border border-primary/20" 
                            : "bg-muted/50 dark:bg-muted/20 text-foreground"
                        )}
                      >
                        <item.icon className="h-6 w-6" />
                        <span className="text-xs font-medium text-center">{child.label}</span>
                      </Link>
                    ))
                  ) : (
                    <Link
                      key={item.label}
                      to={(item.href || '#') as string}
                      onClick={() => setIsMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-2xl gap-2 transition-all active:scale-95",
                        location.pathname === item.href 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-muted/50 dark:bg-muted/20 text-foreground"
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}
