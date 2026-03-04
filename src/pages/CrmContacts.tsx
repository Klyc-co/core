import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw, Search } from "lucide-react";

export default function CrmContacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("crm_contacts").select("*").order(sortCol, { ascending: sortAsc }).limit(200);
    setContacts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [sortCol, sortAsc]);

  const filtered = contacts.filter(c =>
    !search || [c.first_name, c.last_name, c.email, c.company_name].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc(!sortAsc);
    else { setSortCol(col); setSortAsc(true); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">CRM Contacts</h1>
        <Button variant="outline" onClick={fetch}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {[["first_name","First Name"],["last_name","Last Name"],["email","Email"],["company_name","Company"],["lifecycle_stage","Stage"],["source","Source"],["created_at","Created"]].map(([k,l]) => (
                  <TableHead key={k} className="cursor-pointer hover:text-foreground" onClick={() => toggleSort(k)}>{l} {sortCol === k ? (sortAsc ? "↑" : "↓") : ""}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              : filtered.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contacts</TableCell></TableRow>
              : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.first_name || "—"}</TableCell>
                  <TableCell>{c.last_name || "—"}</TableCell>
                  <TableCell className="text-sm">{c.email || "—"}</TableCell>
                  <TableCell>{c.company_name || "—"}</TableCell>
                  <TableCell>{c.lifecycle_stage || "—"}</TableCell>
                  <TableCell>{c.source}</TableCell>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
