import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { ChevronDown, Users, Plus, Check, Briefcase, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientContext } from "@/contexts/ClientContext";

interface Client {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
}

interface ClientSwitcherProps {
  onAddClient: () => void;
}

const ClientSwitcher = ({ onAddClient }: ClientSwitcherProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { selectedClientId, selectedClientName, setSelectedClient, isDefaultClient } = useClientContext();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
      setLoading(false);
    }
  };

  const handleClientChange = (clientId: string | null, clientName: string | null) => {
    setSelectedClient(clientId, clientName);
  };

  const handleDeleteClick = (e: React.MouseEvent, client: Client) => {
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              {isDefaultClient ? (
                <Briefcase className="w-4 h-4" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              <span className="truncate">
                {isDefaultClient ? "My Business" : selectedClientName || "Select Client"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
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
          
          {loading ? (
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
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
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
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAddClient} className="text-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{clientToDelete?.client_name}</strong> and remove all association with your account. This action cannot be undone.
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

export default ClientSwitcher;
