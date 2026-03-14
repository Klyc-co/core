import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dna, FileJson, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";

export interface CompressionState {
  customerDnaLoaded: boolean;
  customerDnaSummary: string | null;
  strategyProfileLoaded: boolean;
  strategyProfileName: string | null;
  lastRunAt: string | null;
}

interface Props {
  state: CompressionState;
  onLoadDna: () => void;
  onLoadStrategy: () => void;
  onRerun: () => void;
  isLoading: boolean;
}

export default function CompressionStatePanel({ state, onLoadDna, onLoadStrategy, onRerun, isLoading }: Props) {
  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Dna className="w-4 h-4 text-primary" />
          State & Compression
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Customer DNA */}
        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Dna className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <span className="text-xs font-medium text-foreground">Customer DNA</span>
              {state.customerDnaLoaded && state.customerDnaSummary && (
                <p className="text-[10px] text-muted-foreground leading-snug max-w-[200px] truncate">{state.customerDnaSummary}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.customerDnaLoaded && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onLoadDna} disabled={isLoading}>
              {state.customerDnaLoaded ? "Reload" : "Load"}
            </Button>
          </div>
        </div>

        {/* Strategy Profile */}
        <div className="flex items-center justify-between rounded-md border border-border/40 bg-background/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <span className="text-xs font-medium text-foreground">Strategy Profile</span>
              {state.strategyProfileLoaded && state.strategyProfileName && (
                <p className="text-[10px] text-muted-foreground">{state.strategyProfileName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.strategyProfileLoaded && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onLoadStrategy} disabled={isLoading}>
              {state.strategyProfileLoaded ? "Reload" : "Load"}
            </Button>
          </div>
        </div>

        {/* Lightweight Re-run */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
          onClick={onRerun}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          {isLoading ? "Processing..." : "Re-run Analysis"}
        </Button>

        {state.lastRunAt && (
          <p className="text-[10px] text-muted-foreground text-center">
            Last run: {new Date(state.lastRunAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
