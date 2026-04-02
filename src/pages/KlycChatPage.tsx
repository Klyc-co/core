import { useKlycOrchestrator } from "@/hooks/useKlycOrchestrator";
import KlycChat from "@/components/KlycChat";

const KlycChatPage = () => {
  const orchestrator = useKlycOrchestrator();

  return (
    <div className="h-full flex flex-col">
      <KlycChat
        messages={orchestrator.messages}
        isThinking={orchestrator.isThinking}
        onSend={orchestrator.sendMessage}
        onSmartPromptSelect={orchestrator.handleSmartPromptSelect}
        soloModeEnabled={orchestrator.soloModeEnabled}
        onToggleSoloMode={orchestrator.toggleSoloMode}
        onApprovalDecision={orchestrator.handleApprovalDecision}
        onActOnAlert={orchestrator.handleActOnAlert}
        onFileAttach={orchestrator.handleFileAttach}
      />
    </div>
  );
};

export default KlycChatPage;
