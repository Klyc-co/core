import { useState, useEffect } from "react";

interface CurrentClientState {
  clientId: string | null;
  clientName: string | null;
}

export const useCurrentClient = () => {
  const [currentClient, setCurrentClient] = useState<CurrentClientState>({
    clientId: null,
    clientName: null,
  });

  useEffect(() => {
    // Load from localStorage on mount
    const savedClientId = localStorage.getItem("currentClientId");
    const savedClientName = localStorage.getItem("currentClientName");
    if (savedClientId) {
      setCurrentClient({
        clientId: savedClientId,
        clientName: savedClientName,
      });
    }

    // Listen for storage changes from other tabs/components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "currentClientId" || e.key === "currentClientName") {
        setCurrentClient({
          clientId: localStorage.getItem("currentClientId"),
          clientName: localStorage.getItem("currentClientName"),
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const setClient = (clientId: string | null, clientName: string | null) => {
    setCurrentClient({ clientId, clientName });
    if (clientId) {
      localStorage.setItem("currentClientId", clientId);
      localStorage.setItem("currentClientName", clientName || "");
    } else {
      localStorage.removeItem("currentClientId");
      localStorage.removeItem("currentClientName");
    }
    // Dispatch storage event for same-tab updates
    window.dispatchEvent(new StorageEvent("storage", {
      key: "currentClientId",
      newValue: clientId,
    }));
  };

  return {
    currentClientId: currentClient.clientId,
    currentClientName: currentClient.clientName,
    setClient,
  };
};
