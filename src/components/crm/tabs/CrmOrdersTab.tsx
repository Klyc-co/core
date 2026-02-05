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
 import { Search, Loader2, ShoppingCart } from "lucide-react";
 import { format } from "date-fns";
 
 interface CrmOrdersTabProps {
   connectionId: string;
 }
 
 interface Order {
   id: string;
   order_number: string;
   customer_email: string | null;
   customer_name: string | null;
   items: unknown;
   total_amount: number | null;
   currency: string | null;
   status: string | null;
   order_date: string | null;
   created_at: string;
 }
 
 const PAGE_SIZE = 10;
 
 const CrmOrdersTab = ({ connectionId }: CrmOrdersTabProps) => {
   const [orders, setOrders] = useState<Order[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
 
   useEffect(() => {
     const fetchOrders = async () => {
       setLoading(true);
       try {
         let query = supabase
           .from("crm_orders")
           .select("*", { count: "exact" })
           .eq("connection_id", connectionId)
           .order("order_date", { ascending: false })
           .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
 
         if (search) {
           query = query.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_name.ilike.%${search}%`);
         }
 
         const { data, error, count } = await query;
 
         if (error) throw error;
         setOrders(data || []);
         setTotalCount(count || 0);
       } catch (error) {
         console.error("Failed to fetch orders:", error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchOrders();
   }, [connectionId, page, search]);
 
   const totalPages = Math.ceil(totalCount / PAGE_SIZE);
 
   const formatCurrency = (value: number | null, currency: string | null) => {
     if (value === null) return "—";
     return new Intl.NumberFormat("en-US", {
       style: "currency",
       currency: currency || "USD",
     }).format(value);
   };
 
   const getItemCount = (items: unknown): number => {
     if (Array.isArray(items)) return items.length;
     return 0;
   };
 
   if (loading && orders.length === 0) {
     return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!loading && orders.length === 0 && !search) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-center">
         <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
           <ShoppingCart className="w-6 h-6 text-muted-foreground" />
         </div>
         <h3 className="font-medium text-foreground mb-1">No orders synced</h3>
         <p className="text-sm text-muted-foreground">
           Orders will appear here after the first sync.
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
           placeholder="Search by order # or customer..."
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
               <TableHead>Order #</TableHead>
               <TableHead>Customer</TableHead>
               <TableHead>Items</TableHead>
               <TableHead>Total</TableHead>
               <TableHead>Status</TableHead>
               <TableHead>Date</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {orders.map((order) => (
               <TableRow key={order.id}>
                 <TableCell className="font-medium font-mono">
                   #{order.order_number}
                 </TableCell>
                 <TableCell>
                   <div>
                     <p className="font-medium">{order.customer_name || "—"}</p>
                     <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                   </div>
                 </TableCell>
                 <TableCell>{getItemCount(order.items)} items</TableCell>
                 <TableCell className="font-medium">
                   {formatCurrency(order.total_amount, order.currency)}
                 </TableCell>
                 <TableCell>
                   {order.status ? (
                     <Badge
                       variant="outline"
                       className={
                         order.status === "fulfilled" || order.status === "completed"
                           ? "text-green-500 border-green-500/20"
                           : order.status === "cancelled" || order.status === "refunded"
                           ? "text-red-500 border-red-500/20"
                           : "text-yellow-500 border-yellow-500/20"
                       }
                     >
                       {order.status}
                     </Badge>
                   ) : (
                     "—"
                   )}
                 </TableCell>
                 <TableCell className="text-muted-foreground">
                   {order.order_date
                     ? format(new Date(order.order_date), "MMM d, yyyy")
                     : "—"}
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
         Showing {orders.length} of {totalCount.toLocaleString()} orders
       </p>
     </div>
   );
 };
 
 export default CrmOrdersTab;