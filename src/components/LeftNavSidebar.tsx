import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSidebarWidth, MIN_WIDTH, MAX_WIDTH } from "@/contexts/SidebarWidthContext";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import SidebarChat from "@/components/SidebarChat";
import {
  LogOut, Settings, MessageSquare, UserCog, Users, Plus, Check,
  Briefcase, Trash2, User, Megaphone, Lightbulb, Palette, Menu, X,
  Shield, FileText, Zap, BarChart3, House, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddClientDialog from "@/components/AddClientDialog";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
}

const subNavItems = [
  { label: "Posts", path: "/campaigns", icon: Megaphone },
  { label: "Creative", path: "/creative-studio", icon: Palette },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Strategy", path: "/strategy", icon: Zap },
  { label: "Learning", path: "/learning", icon: Lightbulb },
];

const LeftNavSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { selectedClientId, selectedClientName, setSelectedClient, isDefaultClient } = useClientContext();

  const { width, setWidth } = useSidebarWidth();
  const isDragging = useRef(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapsible states
  const [navExpanded, setNavExpanded] = useState(false);
  const [utilExpanded, setUtilExpanded] = useState(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, ev.clientX)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [setWidth]);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setClients([]); return; }
      const { data, error } = await supabase
        .from("marketer_clients").select("*").eq("status", "active").order("client_name");
      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({ title: "Error loading clients", description: error.message, variant: "destructive" });
    } finally { setLoadingClients(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const handleDeleteClick = (e: React.MouseEvent, client: Client) => {
    e.preventDefault(); e.stopPropagation();
    setClientToDelete(client); setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("marketer_clients").delete().eq("id", clientToDelete.id);
      if (error) throw error;
      if (selectedClientId === clientToDelete.client_id) setSelectedClient("default", "My Business");
      toast({ title: "Client deleted", description: `${clientToDelete.client_name} has been removed.` });
      fetchClients();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setDeleting(false); setDeleteDialogOpen(false); setClientToDelete(null); }
  };

  const isActive = (path: string) => {
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const closeMobile = () => { if (isMobile) setMobileOpen(false); };

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Logo = Home button */}
      <div className="px-4 pt-3 pb-1 shrink-0">
        <button onClick={() => { navigate("/home"); closeMobile(); }} className="hover:opacity-80 transition-opacity">
          <Logo size="lg" />
        </button>
      </div>

      {/* Client indicator */}
      {!isDefaultClient && selectedClientName && (
        <div className="mx-3 mb-1 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Client</p>
          <p className="text-xs font-semibold text-primary truncate">{selectedClientName}</p>
        </div>
      )}

      {/* Collapse toggle for sub-nav */}
      <div className="px-3 shrink-0">
        <button
          onClick={() => setNavExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="font-medium">Tools</span>
          {navExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Collapsible sub-nav items */}
      {navExpanded && (
        <nav className="px-3 space-y-0.5 shrink-0">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); closeMobile(); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* ===== CHAT fills the middle ===== */}
      <div className="flex-1 min-h-0 flex flex-col mx-2 my-2 border border-border rounded-lg overflow-hidden bg-background/50">
        <SidebarChat />
      </div>

      {/* ===== BOTTOM SECTION ===== */}
      {/* Expand/collapse for utility nav */}
      <div className="px-3 shrink-0">
        <button
          onClick={() => setUtilExpanded((v) => !v)}
          className="w-full flex items-center justify-center py-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          {utilExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Collapsible utility items */}
      {utilExpanded && (
        <div className="px-3 space-y-0.5 shrink-0 pb-1">
          {/* Switch Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                <UserCog className="w-4 h-4 shrink-0" />
                Switch Profile
                {!isDefaultClient && <span className="ml-auto w-2 h-2 bg-primary rounded-full" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-[260px] bg-popover z-[60]">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedClient("default", "My Business")} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-primary" /><span>My Business</span></div>
                {isDefaultClient && <Check className="w-4 h-4 text-primary" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {loadingClients ? (
                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
              ) : clients.length === 0 ? (
                <DropdownMenuItem disabled className="text-muted-foreground">No clients yet</DropdownMenuItem>
              ) : (
                clients.map((client) => (
                  <DropdownMenuItem key={client.id} onClick={() => setSelectedClient(client.client_id, client.client_name)} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Users className="w-4 h-4 shrink-0" /><span className="truncate">{client.client_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedClientId === client.client_id && <Check className="w-4 h-4 text-primary" />}
                      <button onClick={(e) => handleDeleteClick(e, client)} className="p-1 rounded hover:bg-destructive/10 transition-colors"><Trash2 className="w-3 h-3 text-destructive" /></button>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAddClientDialogOpen(true)} className="text-primary">
                <Plus className="w-4 h-4 mr-2" /> Add New Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => { navigate("/messages"); closeMobile(); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              isActive("/messages") && "bg-primary/10 text-primary"
            )}
          >
            <MessageSquare className="w-4 h-4 shrink-0" />Messages
          </button>

          <button
            onClick={() => { navigate("/settings"); closeMobile(); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
              isActive("/settings") && "bg-primary/10 text-primary"
            )}
          >
            <Settings className="w-4 h-4 shrink-0" />Settings
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />Sign Out
          </button>
        </div>
      )}

      {/* Profile — always visible */}
      <div className="px-3 pb-0 shrink-0">
        <button
          onClick={() => { navigate("/profile"); closeMobile(); }}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm border border-transparent text-foreground hover:bg-muted/50 transition-colors",
            location.pathname.startsWith("/profile") ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/30"
          )}
        >
          <User className="w-4 h-4 shrink-0" /><span>Profile</span>
        </button>
      </div>

      {/* Terms & Privacy — always visible */}
      <div className="px-3 pb-2 shrink-0">
        <div className="pt-1 flex gap-1">
          <button onClick={() => { navigate("/terms"); closeMobile(); }} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <FileText className="w-2.5 h-2.5 shrink-0" />Terms
          </button>
          <button onClick={() => { navigate("/privacy"); closeMobile(); }} className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg text-[10px] text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30 transition-colors">
            <Shield className="w-2.5 h-2.5 shrink-0" />Privacy
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile
  if (isMobile) {
    return (
      <>
        <Button onClick={() => setMobileOpen(true)} className="fixed top-3 left-3 z-50 h-10 w-10 rounded-lg bg-card border border-border shadow-sm" variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setMobileOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-[280px] bg-card border-r border-border z-50 overflow-hidden flex flex-col">
              <div className="absolute top-3 right-3 z-10">
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
              </div>
              {navContent}
            </div>
          </>
        )}
        <AddClientDialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen} onClientAdded={fetchClients} />
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete <strong>{clientToDelete?.client_name}</strong>.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive hover:bg-destructive/90">{deleting ? "Deleting..." : "Delete"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Desktop
  return (
    <>
      <div
        className="fixed left-0 top-0 h-screen bg-card/80 backdrop-blur-sm border-r border-border z-40 flex flex-col overflow-hidden"
        style={{ width: `${width}px` }}
      >
        {navContent}
      </div>
      {/* Drag handle */}
      <div
        className="fixed top-0 h-screen w-4 z-50 cursor-col-resize group flex items-center justify-center"
        style={{ left: `${width - 8}px` }}
        onMouseDown={handleDragStart}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/40 transition-colors" />
        <div className="relative flex items-center gap-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
          <ChevronLeft className="w-3 h-3" />
          <ChevronRight className="w-3 h-3 -ml-1.5" />
        </div>
      </div>
      <AddClientDialog open={addClientDialogOpen} onOpenChange={setAddClientDialogOpen} onClientAdded={fetchClients} />
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete <strong>{clientToDelete?.client_name}</strong>.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleting} className="bg-destructive hover:bg-destructive/90">{deleting ? "Deleting..." : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeftNavSidebar;
