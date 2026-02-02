import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClientContextState {
  // The selected client's user_id (for data fetching) - null means "My Business" (marketer's own)
  selectedClientUserId: string | null;
  // Display name of the selected client
  selectedClientName: string | null;
  // The marketer_clients.client_id (for the switcher) - "default" means "My Business"
  selectedClientId: string | null;
  // The logged-in user's ID (marketer)
  marketerId: string | null;
  // Set the current client
  setSelectedClient: (clientId: string | null, clientName: string | null) => void;
  // Whether we're in "My Business" mode (marketer's own profile)
  isDefaultClient: boolean;
  // Get the effective user_id for data fetching
  getEffectiveUserId: () => string | null;
}

const ClientContext = createContext<ClientContextState | undefined>(undefined);

export const ClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedClientUserId, setSelectedClientUserId] = useState<string | null>(null);
  const [marketerId, setMarketerId] = useState<string | null>(null);

  // Load from localStorage and set up user on mount
  useEffect(() => {
    const initializeClient = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMarketerId(user.id);
        
        const savedClientId = localStorage.getItem("currentClientId");
        const savedClientName = localStorage.getItem("currentClientName");
        
        if (savedClientId && savedClientId !== "default") {
          setSelectedClientId(savedClientId);
          setSelectedClientName(savedClientName);
          // Fetch the actual user_id for this client
          const { data } = await supabase
            .from("marketer_clients")
            .select("client_id")
            .eq("client_id", savedClientId)
            .maybeSingle();
          
          if (data) {
            setSelectedClientUserId(data.client_id);
          }
        } else {
          // Default to "My Business" - marketer's own profile
          setSelectedClientId("default");
          setSelectedClientName("My Business");
          setSelectedClientUserId(null);
        }
      }
    };

    initializeClient();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setMarketerId(session.user.id);
      } else {
        setMarketerId(null);
        setSelectedClientId(null);
        setSelectedClientName(null);
        setSelectedClientUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setSelectedClient = useCallback(async (clientId: string | null, clientName: string | null) => {
    if (clientId === "default" || clientId === null) {
      // "My Business" mode - use marketer's own profile
      setSelectedClientId("default");
      setSelectedClientName("My Business");
      setSelectedClientUserId(null);
      localStorage.setItem("currentClientId", "default");
      localStorage.setItem("currentClientName", "My Business");
    } else {
      setSelectedClientId(clientId);
      setSelectedClientName(clientName);
      // The client_id in marketer_clients IS the user_id of the client
      setSelectedClientUserId(clientId);
      localStorage.setItem("currentClientId", clientId);
      localStorage.setItem("currentClientName", clientName || "");
    }
    
    // Dispatch event for any components listening
    window.dispatchEvent(new StorageEvent("storage", {
      key: "currentClientId",
      newValue: clientId,
    }));
  }, []);

  const isDefaultClient = selectedClientId === "default" || selectedClientId === null;

  const getEffectiveUserId = useCallback(() => {
    // If default client or no client selected, use marketer's own ID
    if (isDefaultClient) {
      return marketerId;
    }
    // Otherwise use the selected client's user_id
    return selectedClientUserId;
  }, [isDefaultClient, marketerId, selectedClientUserId]);

  return (
    <ClientContext.Provider
      value={{
        selectedClientUserId,
        selectedClientName,
        selectedClientId,
        marketerId,
        setSelectedClient,
        isDefaultClient,
        getEffectiveUserId,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error("useClientContext must be used within a ClientProvider");
  }
  return context;
};
