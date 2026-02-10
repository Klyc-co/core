import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search, RefreshCw, Check, Database, Table2, ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AirtableDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

interface AirtableBase {
  id: string;
  name: string;
}

interface AirtableField {
  id: string;
  name: string;
  type: string;
}

interface AirtableTable {
  id: string;
  name: string;
  description?: string;
  fields: AirtableField[];
}

interface ExistingMapping {
  id?: string;
  airtable_base_id: string;
  airtable_table_id: string;
  airtable_table_name?: string;
  table_type: string;
  column_mappings: Record<string, string>;
  is_synced: boolean;
  synced_record_count?: number;
}

const TABLE_TYPES = [
  { value: "content_calendar", label: "Content Calendar" },
  { value: "brief", label: "Campaign Briefs" },
  { value: "persona", label: "Personas" },
  { value: "campaign", label: "Campaigns" },
  { value: "other", label: "Other (generic notes)" },
];

const KLYC_FIELDS: Record<string, { value: string; label: string }[]> = {
  content_calendar: [
    { value: "title", label: "Title" },
    { value: "description", label: "Description / Caption" },
    { value: "status", label: "Status" },
    { value: "platform", label: "Platform" },
    { value: "publishDate", label: "Publish date" },
    { value: "persona", label: "Persona" },
    { value: "campaignTag", label: "Campaign" },
    { value: "assetUrl", label: "Asset URL" },
    { value: "hashtags", label: "Hashtags" },
    { value: "cta", label: "CTA" },
    { value: "owner", label: "Owner" },
    { value: "notes", label: "Notes" },
  ],
  brief: [
    { value: "name", label: "Campaign name" },
    { value: "objective", label: "Objective" },
    { value: "targetAudience", label: "Target audience" },
    { value: "keyMessage", label: "Key message" },
    { value: "channels", label: "Channels" },
    { value: "budget", label: "Budget" },
    { value: "primaryKpi", label: "KPI" },
  ],
  persona: [
    { value: "name", label: "Persona name" },
    { value: "description", label: "Description" },
    { value: "painPoints", label: "Pain points" },
    { value: "goals", label: "Goals" },
    { value: "channels", label: "Preferred channels" },
  ],
  campaign: [
    { value: "name", label: "Campaign name" },
    { value: "objective", label: "Objective" },
    { value: "startDate", label: "Start date" },
    { value: "endDate", label: "End date" },
    { value: "primaryKpi", label: "Primary KPI" },
    { value: "budget", label: "Budget" },
    { value: "notes", label: "Notes" },
  ],
  other: [
    { value: "title", label: "Title" },
    { value: "description", label: "Description" },
    { value: "notes", label: "Notes" },
  ],
};

export default function AirtableDrawer({ open, onOpenChange, userId }: AirtableDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [bases, setBases] = useState<AirtableBase[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBase, setSelectedBase] = useState<AirtableBase | null>(null);
  const [tables, setTables] = useState<AirtableTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<AirtableTable | null>(null);
  const [mappings, setMappings] = useState<Record<string, ExistingMapping>>({});
  const [currentTableType, setCurrentTableType] = useState("other");
  const [currentColumnMappings, setCurrentColumnMappings] = useState<Record<string, string>>({});
  const [savingMapping, setSavingMapping] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState("manual");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);

  const fetchBases = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("airtable-list-bases", {
        body: {},
      });
      if (error) throw error;
      setBases(data.bases || []);
      // Build mapping index from existing mappings
      const mappingIndex: Record<string, ExistingMapping> = {};
      for (const m of data.mappings || []) {
        mappingIndex[`${m.airtable_base_id}:${m.airtable_table_id}`] = m;
      }
      setMappings(mappingIndex);
    } catch (err: any) {
      toast.error("Failed to load Airtable bases");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConnectionInfo = useCallback(async () => {
    const { data } = await supabase.functions.invoke("airtable-connect", {
      body: { action: "status" },
    });
    if (data?.connection) {
      setConnectionInfo(data.connection);
      setSyncFrequency(data.connection.sync_frequency || "manual");
      setLastSyncAt(data.connection.last_sync_at);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchBases();
      fetchConnectionInfo();
    }
  }, [open, fetchBases, fetchConnectionInfo]);

  const handleBaseClick = async (base: AirtableBase) => {
    setSelectedBase(base);
    setSelectedTable(null);
    setTablesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("airtable-list-bases", {
        body: { baseId: base.id },
      });
      if (error) throw error;
      setTables(data.tables || []);
      // Update mappings
      const newMappings = { ...mappings };
      for (const m of data.mappings || []) {
        newMappings[`${m.airtable_base_id}:${m.airtable_table_id}`] = m;
      }
      setMappings(newMappings);
    } catch (err: any) {
      toast.error(`Failed to load tables for ${base.name}`);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleTableSelect = (table: AirtableTable) => {
    setSelectedTable(table);
    const key = `${selectedBase?.id}:${table.id}`;
    const existing = mappings[key];
    if (existing) {
      setCurrentTableType(existing.table_type || "other");
      setCurrentColumnMappings(existing.column_mappings || {});
    } else {
      setCurrentTableType("other");
      setCurrentColumnMappings({});
    }
  };

  const handleSaveMapping = async () => {
    if (!selectedBase || !selectedTable) return;
    setSavingMapping(true);
    try {
      const { error } = await supabase.functions.invoke("airtable-save-mapping", {
        body: {
          baseId: selectedBase.id,
          baseName: selectedBase.name,
          tableId: selectedTable.id,
          tableName: selectedTable.name,
          tableType: currentTableType,
          columnMappings: currentColumnMappings,
          isSynced: true,
        },
      });
      if (error) throw error;
      toast.success(`Mapping saved for ${selectedTable.name}`);
      // Update local state
      const key = `${selectedBase.id}:${selectedTable.id}`;
      setMappings(prev => ({
        ...prev,
        [key]: {
          airtable_base_id: selectedBase.id,
          airtable_table_id: selectedTable.id,
          airtable_table_name: selectedTable.name,
          table_type: currentTableType,
          column_mappings: currentColumnMappings,
          is_synced: true,
        },
      }));
    } catch (err: any) {
      toast.error("Failed to save mapping");
    } finally {
      setSavingMapping(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("airtable-sync", {
        body: {},
      });
      if (error) throw error;
      const counts = data.counts || {};
      const total = Object.values(counts).reduce((s: number, v: any) => s + (v || 0), 0);
      toast.success(`Synced ${total} records across ${Object.keys(counts).length} table types`);
      setLastSyncAt(new Date().toISOString());
      // Refresh bases to get updated counts
      fetchBases();
    } catch (err: any) {
      toast.error("Sync failed: " + (err.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const filteredBases = bases.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMappingKey = (baseId: string, tableId: string) => `${baseId}:${tableId}`;
  const getTableTypeBadge = (baseId: string, tableId: string) => {
    const m = mappings[getMappingKey(baseId, tableId)];
    if (!m) return null;
    const typeLabel = TABLE_TYPES.find(t => t.value === m.table_type)?.label || "Unmapped";
    return <Badge variant="secondary" className="text-xs">{typeLabel}</Badge>;
  };

  const klycFieldsForType = KLYC_FIELDS[currentTableType] || KLYC_FIELDS.other;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">Airtable Integration</SheetTitle>
              <SheetDescription>
                Select bases, tables, and map columns to Klyc marketing fields.
              </SheetDescription>
            </div>
            <Button
              onClick={handleSyncNow}
              disabled={syncing}
              size="sm"
              className="gap-2"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run Sync Now
            </Button>
          </div>
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last synced: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Bases & Tables */}
          <div className="w-1/2 border-r border-border flex flex-col">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bases & tables…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <Accordion type="multiple" className="px-4 py-2">
                  {filteredBases.map(base => (
                    <AccordionItem key={base.id} value={base.id}>
                      <AccordionTrigger
                        className="text-sm font-medium hover:no-underline"
                        onClick={() => {
                          if (!selectedBase || selectedBase.id !== base.id) {
                            handleBaseClick(base);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          {base.name}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        {selectedBase?.id === base.id && tablesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        ) : selectedBase?.id === base.id ? (
                          <div className="space-y-1 pl-2">
                            {tables.map(table => {
                              const isSelected = selectedTable?.id === table.id;
                              return (
                                <button
                                  key={table.id}
                                  onClick={() => handleTableSelect(table)}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between gap-2 transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 text-primary"
                                      : "hover:bg-muted text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Table2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="truncate">{table.name}</span>
                                  </div>
                                  {getTableTypeBadge(base.id, table.id)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-2 pl-2">
                            Click to load tables
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </ScrollArea>
          </div>

          {/* Right: Mapping config */}
          <div className="w-1/2 flex flex-col">
            {selectedTable && selectedBase ? (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{selectedBase.name}</p>
                    <h3 className="text-lg font-semibold text-foreground">{selectedTable.name}</h3>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      What type of data is this table?
                    </label>
                    <Select value={currentTableType} onValueChange={setCurrentTableType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TABLE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-3">Column Mapping</h4>
                    <div className="space-y-2">
                      {selectedTable.fields.map(field => (
                        <div key={field.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{field.name}</p>
                            <p className="text-xs text-muted-foreground">{field.type}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <Select
                            value={currentColumnMappings[field.name] || "ignore"}
                            onValueChange={val => {
                              setCurrentColumnMappings(prev => ({
                                ...prev,
                                [field.name]: val,
                              }));
                            }}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">Ignore</SelectItem>
                              {klycFieldsForType.map(f => (
                                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveMapping}
                    disabled={savingMapping}
                    className="w-full gap-2"
                  >
                    {savingMapping ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save mapping for this table
                  </Button>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center text-muted-foreground">
                  <Table2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a table from the left to configure its mapping</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Sync Settings */}
        <div className="border-t border-border px-6 py-4 space-y-3">
          <h4 className="text-sm font-medium text-foreground">Sync Settings</h4>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Sync frequency</label>
              <Select value={syncFrequency} onValueChange={setSyncFrequency}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual only</SelectItem>
                  <SelectItem value="4hours">Every 4 hours</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {lastSyncAt && (
              <div className="text-xs text-muted-foreground">
                <p>Last sync: {new Date(lastSyncAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            We only pull mapped columns, never modify your Airtable data.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
