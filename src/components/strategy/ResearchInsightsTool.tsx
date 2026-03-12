import { useState, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

// These are rendered inline as tabs
const RunReportContent = lazy(() => import("@/components/strategy/RunReportContent"));
const CompetitorAnalysisContent = lazy(() => import("@/components/strategy/CompetitorAnalysisContent"));
const TrendMonitorContent = lazy(() => import("@/components/strategy/TrendMonitorContent"));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export default function ResearchInsightsTool() {
  return (
    <Tabs defaultValue="run-report" className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
        <TabsTrigger value="run-report" className="text-xs sm:text-sm">Run Report</TabsTrigger>
        <TabsTrigger value="competitor" className="text-xs sm:text-sm">Competitor Analysis</TabsTrigger>
        <TabsTrigger value="trends" className="text-xs sm:text-sm">Trend Monitor</TabsTrigger>
      </TabsList>

      <TabsContent value="run-report">
        <Suspense fallback={<TabLoader />}>
          <RunReportContent />
        </Suspense>
      </TabsContent>
      <TabsContent value="competitor">
        <Suspense fallback={<TabLoader />}>
          <CompetitorAnalysisContent />
        </Suspense>
      </TabsContent>
      <TabsContent value="trends">
        <Suspense fallback={<TabLoader />}>
          <TrendMonitorContent />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
