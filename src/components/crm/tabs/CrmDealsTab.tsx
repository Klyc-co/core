 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Input } from "@/components/ui/input";
 import { Badge } from "@/components/ui/badge";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import {
   Pagination,
   PaginationContent,
   PaginationItem,
   PaginationLink,
   PaginationNext,
   PaginationPrevious,
 } from "@/components/ui/pagination";
 import { Search, Loader2, Briefcase } from "lucide-react";
 import { format } from "date-fns";
 
 interface CrmDealsTabProps {
   connectionId: string;
 }
 
 interface Deal {
   id: string;
   name: string;
   stage: string | null;
   value: number | null;
   currency: string | null;
   close_date: string | null;
   owner: string | null;
   status: string | null;
   created_at: string;
 }
 
 const PAGE_SIZE = 10;
 
 const CrmDealsTab = ({ connectionId }: CrmDealsTabProps) => {
   const [deals, setDeals] = useState<Deal[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
 
   useEffect(() => {
     const fetchDeals = async () => {
       setLoading(true);
       try {
         let query = supabase
           .from("crm_deals")
           .select("*", { count: "exact" })
           .eq("connection_id", connectionId)
           .order("created_at", { ascending: false })
           .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
 
         if (search) {
           query = query.ilike("name", `%${search}%`);
         }
 
         const { data, error, count } = await query;
 
         if (error) throw error;
         setDeals(data || []);
         setTotalCount(count || 0);
       } catch (error) {
         console.error("Failed to fetch deals:", error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchDeals();
   }, [connectionId, page, search]);
 
   const totalPages = Math.ceil(totalCount / PAGE_SIZE);
 
   const formatCurrency = (value: number | null, currency: string | null) => {
     if (value === null) return "—";
     return new Intl.NumberFormat("en-US", {
       style: "currency",
       currency: currency || "USD",
     }).format(value);
   };
 
   if (loading && deals.length === 0) {
     return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!loading && deals.length === 0 && !search) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-center">
         <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
           <Briefcase className="w-6 h-6 text-muted-foreground" />
         </div>
         <h3 className="font-medium text-foreground mb-1">No deals synced</h3>
         <p className="text-sm text-muted-foreground">
           Deals will appear here after the first sync.
         </p>
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       {/* Search */}
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
         <Input
           placeholder="Search by deal name..."
           value={search}
           onChange={(e) => {
             setSearch(e.target.value);
             setPage(1);
           }}
           className="pl-10"
         />
       </div>
 
       {/* Table */}
       <div className="border rounded-lg overflow-hidden">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Deal Name</TableHead>
               <TableHead>Stage</TableHead>
               <TableHead>Value</TableHead>
               <TableHead>Close Date</TableHead>
               <TableHead>Owner</TableHead>
               <TableHead>Status</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {deals.map((deal) => (
               <TableRow key={deal.id}>
                 <TableCell className="font-medium">{deal.name}</TableCell>
                 <TableCell>
                   {deal.stage ? (
                     <Badge variant="secondary">{deal.stage}</Badge>
                   ) : (
                     "—"
                   )}
                 </TableCell>
                 <TableCell className="font-medium">
                   {formatCurrency(deal.value, deal.currency)}
                 </TableCell>
                 <TableCell>
                   {deal.close_date ? format(new Date(deal.close_date), "MMM d, yyyy") : "—"}
                 </TableCell>
                 <TableCell>{deal.owner || "—"}</TableCell>
                 <TableCell>
                   {deal.status ? (
                     <Badge
                       variant="outline"
                       className={
                         deal.status === "won"
                           ? "text-green-500 border-green-500/20"
                           : deal.status === "lost"
                           ? "text-red-500 border-red-500/20"
                           : ""
                       }
                     >
                       {deal.status}
                     </Badge>
                   ) : (
                     "—"
                   )}
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
 
       {/* Pagination */}
       {totalPages > 1 && (
         <Pagination>
           <PaginationContent>
             <PaginationItem>
               <PaginationPrevious
                 onClick={() => setPage((p) => Math.max(1, p - 1))}
                 className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
               />
             </PaginationItem>
             {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
               const pageNum = i + 1;
               return (
                 <PaginationItem key={pageNum}>
                   <PaginationLink
                     isActive={page === pageNum}
                     onClick={() => setPage(pageNum)}
                     className="cursor-pointer"
                   >
                     {pageNum}
                   </PaginationLink>
                 </PaginationItem>
               );
             })}
             <PaginationItem>
               <PaginationNext
                 onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                 className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
               />
             </PaginationItem>
           </PaginationContent>
         </Pagination>
       )}
 
       <p className="text-sm text-muted-foreground text-center">
         Showing {deals.length} of {totalCount.toLocaleString()} deals
       </p>
     </div>
   );
 };
 
 export default CrmDealsTab;