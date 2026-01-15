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
import { ChevronDown, Users, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string | null;
}

interface ClientSwitcherProps {
  currentClientId: string | null;
  onClientChange: (clientId: string | null, clientName: string | null) => void;
  onAddClient: () => void;
}

const ClientSwitcher = ({ currentClientId, onClientChange, onAddClient }: ClientSwitcherProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
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

  const currentClient = clients.find(c => c.client_id === currentClientId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="truncate">
              {currentClient ? currentClient.client_name : "Select Client"}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[250px]">
        <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>Loading clients...</DropdownMenuItem>
        ) : clients.length === 0 ? (
          <DropdownMenuItem disabled>No clients yet</DropdownMenuItem>
        ) : (
          clients.map((client) => (
            <DropdownMenuItem
              key={client.id}
              onClick={() => onClientChange(client.client_id, client.client_name)}
              className="flex items-center justify-between"
            >
              <span className="truncate">{client.client_name}</span>
              {currentClientId === client.client_id && (
                <Check className="w-4 h-4 text-primary" />
              )}
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
  );
};

export default ClientSwitcher;
