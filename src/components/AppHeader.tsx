import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Settings,
  MessageSquare,
  Menu,
  UserCog,
  Users,
  Plus,
  Check,
  Briefcase,
  Trash2,
} from "lucide-react";
import Logo from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useClientContext } from "@/contexts/ClientContext";
import { useToast } from "@/hooks/use-toast";
import AddClientDialog from "@/components/AddClientDialog";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Client {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
}

interface AppHeaderProps {
  user: SupabaseUser | null;
  businessName?: string;
  unreadMessages?: number;
  onAddClient?: () => void;
}

const AppHeader = ({ user, businessName, unreadMessages = 0, onAddClient }: AppHeaderProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [addClientDialogOpen, setAddClientDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { selectedClientId, selectedClientName, setSelectedClient, isDefaultClient } = useClientContext();

  const fetchClients = async () => {
    try {
      const { data: { user: authedUser } } = await supabase.auth.getUser();
      if (!authedUser) {
        setClients([]);
        return;
      }

      const { data, error } = await supabase
        .from("marketer_clients")
        .select("*")
        .eq("status", "active")
        .order("client_name");

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading clients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch clients on mount
  useEffect(() => {
    fetchClients();
  }, [toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddClientClick = () => {
    if (onAddClient) {
      onAddClient();
    } else {
      setAddClientDialogOpen(true);
    }
  };

  const handleClientAdded = () => {
    fetchClients();
  };

  const handleDeleteClick = (e: React.MouseEvent, client: Client) => {
    e.preventDefault();
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("marketer_clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) throw error;

      // If the deleted client was selected, switch back to default
      if (selectedClientId === clientToDelete.client_id) {
        setSelectedClient("default", "My Business");
      }

      toast({
        title: "Client deleted",
        description: `${clientToDelete.client_name} has been removed.`,
      });

      fetchClients();
    } catch (error: any) {
      toast({
        title: "Error deleting client",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

const navItems = [
  { label: "Profile", path: "/profile" },
    { label: "Campaigns", path: "/campaigns" },
    { label: "Library", path: "/profile/library" },
    { label: "Strategy", path: "/brand-strategy" },
  ];

  const NavButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "flex flex-col gap-2" : "flex items-center gap-2"}>
      {navItems.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          onClick={() => {
            navigate(item.path);
            if (mobile) setMobileMenuOpen(false);
          }}
          className={`justify-start ${mobile ? "w-full text-left h-12 text-base" : "border border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );

  const handleClientChange = (clientId: string | null, clientName: string | null) => {
    setSelectedClient(clientId, clientName);
  };

  const ClientSwitcherDropdown = ({ mobile = false }: { mobile?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={mobile ? "default" : "icon"}
          className={`relative ${mobile ? "justify-start w-full h-12" : ""}`}
        >
          <UserCog className="w-4 h-4" />
          {mobile && <span className="ml-2">Switch Profile</span>}
          {!isDefaultClient && !mobile && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] bg-popover z-50">
        <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Default "My Business" option */}
        <DropdownMenuItem
          onClick={() => handleClientChange("default", "My Business")}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" />
            <span>My Business</span>
          </div>
          {isDefaultClient && (
            <Check className="w-4 h-4 text-primary" />
          )}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {loadingClients ? (
          <DropdownMenuItem disabled>Loading clients...</DropdownMenuItem>
        ) : clients.length === 0 ? (
          <DropdownMenuItem disabled className="text-muted-foreground">No clients yet</DropdownMenuItem>
        ) : (
          clients.map((client) => (
            <DropdownMenuItem
              key={client.id}
              onClick={() => handleClientChange(client.client_id, client.client_name)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">{client.client_name}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {selectedClientId === client.client_id && (
                  <Check className="w-4 h-4 text-primary" />
                )}

                <button
                  onClick={(e) => handleDeleteClick(e, client)}
                  className="p-1 rounded hover:bg-destructive/10 transition-colors"
                  title="Delete client"
                  aria-label={`Delete ${client.client_name}`}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleAddClientClick} className="text-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add New Client
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ActionButtons = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? "flex flex-col gap-2 pt-4 border-t border-border" : "flex items-center gap-1"}>
      {businessName && !mobile && (
        <span className="text-sm text-muted-foreground mr-2 hidden lg:block">{businessName}</span>
      )}
      
      {/* Client Switcher */}
      <ClientSwitcherDropdown mobile={mobile} />
      
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          navigate("/messages");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={`relative ${mobile ? "justify-start w-full h-12" : ""}`}
      >
        <MessageSquare className="w-4 h-4" />
        {mobile && <span className="ml-2">Messages</span>}
        {unreadMessages > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
            {unreadMessages > 9 ? "9+" : unreadMessages}
          </span>
        )}
      </Button>
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          navigate("/settings");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12" : ""}
      >
        <Settings className="w-4 h-4" />
        {mobile && <span className="ml-2">Settings</span>}
      </Button>
      <Button 
        variant="ghost" 
        size={mobile ? "default" : "icon"}
        onClick={() => {
          handleLogout();
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12 text-destructive hover:text-destructive" : ""}
      >
        <LogOut className="w-4 h-4" />
        {mobile && <span className="ml-2">Logout</span>}
      </Button>
      {!mobile && (
        <span className="mx-1 h-5 w-px bg-border" />
      )}
      <Button
        variant="ghost"
        size={mobile ? "default" : "sm"}
        onClick={() => {
          navigate("/terms");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12 text-muted-foreground" : "text-xs text-muted-foreground hover:text-foreground px-2"}
      >
        {mobile ? "Terms of Service" : "Terms"}
      </Button>
      <Button
        variant="ghost"
        size={mobile ? "default" : "sm"}
        onClick={() => {
          navigate("/privacy");
          if (mobile) setMobileMenuOpen(false);
        }}
        className={mobile ? "justify-start w-full h-12 text-muted-foreground" : "text-xs text-muted-foreground hover:text-foreground px-2"}
      >
        Privacy
      </Button>
    </div>
  );

  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <Logo />
            {!isMobile && <NavButtons />}
          </div>

          {isMobile ? (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-6">
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <Logo />
                  </div>
                  {!isDefaultClient && selectedClientName && (
                    <div className="mb-4 pb-4 border-b border-border">
                      <p className="text-xs text-muted-foreground mb-1">Current Client</p>
                      <p className="font-semibold text-primary">{selectedClientName}</p>
                    </div>
                  )}
                  {businessName && (
                    <p className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                      Working on: <span className="font-medium text-foreground">{businessName}</span>
                    </p>
                  )}
                  <NavButtons mobile />
                  <div className="flex-1" />
                  <ActionButtons mobile />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <ActionButtons />
          )}
        </div>
      </header>

      {/* Internal Add Client Dialog - used when no onAddClient prop is provided */}
      <AddClientDialog
        open={addClientDialogOpen}
        onOpenChange={setAddClientDialogOpen}
        onClientAdded={handleClientAdded}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{clientToDelete?.client_name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppHeader;
