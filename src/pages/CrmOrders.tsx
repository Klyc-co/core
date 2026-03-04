import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search } from "lucide-react";

export default function CrmOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_orders").select("*").order("created_at", { ascending: false }).limit(200);
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = orders.filter(o => !search || [o.order_number, o.customer_name, o.customer_email].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">CRM Orders</h1>
        <Button variant="outline" onClick={fetch}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders</TableCell></TableRow>
              : filtered.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.order_number}</TableCell>
                  <TableCell>{o.customer_name || "—"}</TableCell>
                  <TableCell className="text-sm">{o.customer_email || "—"}</TableCell>
                  <TableCell>{o.total_amount != null ? `$${Number(o.total_amount).toLocaleString()}` : "—"} {o.currency || ""}</TableCell>
                  <TableCell><Badge variant="secondary">{o.status || "—"}</Badge></TableCell>
                  <TableCell className="text-xs">{o.order_date ? new Date(o.order_date).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
