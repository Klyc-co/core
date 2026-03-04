import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search } from "lucide-react";

export default function CrmDeals() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_deals").select("*").order("created_at", { ascending: false }).limit(200);
    setDeals(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = deals.filter(d => !search || d.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">CRM Deals</h1>
        <Button variant="outline" onClick={fetch}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search deals…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Close Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No deals</TableCell></TableRow>
              : filtered.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell><Badge variant="secondary">{d.stage || "—"}</Badge></TableCell>
                  <TableCell>{d.value != null ? `$${Number(d.value).toLocaleString()}` : "—"}</TableCell>
                  <TableCell>{d.currency || "USD"}</TableCell>
                  <TableCell>{d.status || "—"}</TableCell>
                  <TableCell>{d.owner || "—"}</TableCell>
                  <TableCell className="text-xs">{d.close_date ? new Date(d.close_date).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
