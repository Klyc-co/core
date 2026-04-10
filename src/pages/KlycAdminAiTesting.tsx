import { useEffect, useRef } from "react";

const DASHBOARD_HTML_URL = "/ai-testing-dashboard.html";

export default function KlycAdminAiTesting() {
  return (
    <div className="flex flex-col h-full w-full" style={{ minHeight: "calc(100vh - 60px)" }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="text-xl font-bold">AI Testing & Measurement</h1>
          <p className="text-sm text-muted-foreground mt-0.5">KNP compression testing · submind resolution · live pipeline metrics</p>
        </div>
      </div>
      <iframe
        src={DASHBOARD_HTML_URL}
        className="flex-1 w-full border-0"
        style={{ height: "calc(100vh - 120px)" }}
        title="AI Testing and Measurement Dashboard"
      />
    </div>
  );
}
