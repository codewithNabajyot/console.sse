import React from 'react'
import { Link, useLocation, Outlet, useParams } from 'react-router-dom'
import { 
  BarChart3, 
  PlusCircle, 
  Receipt, 
  Settings, 
  Wallet,
  LayoutDashboard,
  FolderKanban,
  FileText,
  Menu,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ModeToggle } from '@/components/ModeToggle'
import { Button } from '@/components/ui/button'

export const DashboardLayout: React.FC = () => {
  const { orgSlug } = useParams()
  const location = useLocation()
  const [isMoreOpen, setIsMoreOpen] = React.useState(false)

  const navItems = [
    { label: 'Home', icon: LayoutDashboard, href: `/${orgSlug}/dashboard` },
    { label: 'Projects', icon: FolderKanban, href: `/${orgSlug}/projects` },
    { label: 'Invoices', icon: FileText, href: `/${orgSlug}/invoices` },
    { label: 'Income', icon: Wallet, href: `/${orgSlug}/income` },
    { label: 'Quick Add', icon: PlusCircle, href: `/${orgSlug}/add`, primary: true },
    { label: 'Expenses', icon: Receipt, href: `/${orgSlug}/expenses` },
    { label: 'Stats', icon: BarChart3, href: `/${orgSlug}/stats` },
  ]

  const mobileBottomItems = ['Home', 'Projects', 'Quick Add']
  const moreItems = navItems.filter(item => !mobileBottomItems.includes(item.label) && !item.primary)

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-4xl">
          <div className="flex items-center gap-2">
            <Link to={`/${orgSlug}/dashboard`} className="flex items-center gap-2">
              <img 
                src="/Suryasathi_logo_hz.svg" 
                alt="Suryasathi Logo" 
                className="h-8 md:h-10 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Bell className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
            </Button>
            <ModeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
              <Settings className="h-[1.2rem] w-[1.2rem] text-muted-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-8 pt-4 md:pl-64">
        <div className="container px-4 mx-auto max-w-md md:max-w-4xl">
          <Outlet />
        </div>
      </main>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 border-r bg-white dark:bg-slate-900 overflow-y-auto">
        <nav className="flex flex-col w-full p-4 gap-2">
          {navItems.map((item) => {
            if (item.primary) return null;
            
            const isActive = location.pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary dark:bg-primary/20" 
                    : "text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                {item.label}
              </Link>
            )
          })}
          
          <div className="mt-auto pt-4 border-t border-border">
            <Link
              to={`/${orgSlug}/add`}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
            >
              <PlusCircle className="h-5 w-5" />
              Quick Add
            </Link>
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
              <Link 
                key={item.href} 
                to={item.href}
                className="relative -top-6 bg-primary text-primary-foreground h-14 w-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-all border-4 border-background"
              >
                <Icon className="h-6 w-6" />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
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
                <Link
                  key={item.href}
                  to={item.href}
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
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}
