import { useKlycOrchestrator } from "@/hooks/useKlycOrchestrator";
import KlycChat from "@/components/KlycChat";

const KlycChatPage = () => {
  const orchestrator = useKlycOrchestrator();

  return (
    <div className="h-full flex flex-col">
      <KlycChat
        messages={orchestrator.messages}
        isThinking={orchestrator.isThinking}
        mode={orchestrator.mode}
        pendingApprovals={orchestrator.pendingApprovals}
        competitorAlerts={orchestrator.competitorAlerts}
        onSendMessage={orchestrator.sendMessage}
        onSelectOption={orchestrator.selectOption}
        onApproval={orchestrator.handleApproval}
        onToggleMode={orchestrator.toggleMode}
        onDismissAlert={orchestrator.dismissAlert}
        onActOnAlert={orchestrator.dismissAlert}
      />
    </div>
  );
};

export default KlycChatPage;
