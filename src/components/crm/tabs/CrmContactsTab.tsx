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
 import { Search, Loader2, Users } from "lucide-react";
 import { formatDistanceToNow } from "date-fns";
 
 interface CrmContactsTabProps {
   connectionId: string;
 }
 
 interface Contact {
   id: string;
   email: string | null;
   first_name: string | null;
   last_name: string | null;
   company_name: string | null;
   lifecycle_stage: string | null;
   tags: unknown;
   source: string;
   created_at: string;
   updated_at: string;
 }
 
 const PAGE_SIZE = 10;
 
 const CrmContactsTab = ({ connectionId }: CrmContactsTabProps) => {
   const [contacts, setContacts] = useState<Contact[]>([]);
   const [loading, setLoading] = useState(true);
   const [search, setSearch] = useState("");
   const [page, setPage] = useState(1);
   const [totalCount, setTotalCount] = useState(0);
 
   useEffect(() => {
     const fetchContacts = async () => {
       setLoading(true);
       try {
         let query = supabase
           .from("crm_contacts")
           .select("*", { count: "exact" })
           .eq("connection_id", connectionId)
           .order("created_at", { ascending: false })
           .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
 
         if (search) {
           query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
         }
 
         const { data, error, count } = await query;
 
         if (error) throw error;
         setContacts(data || []);
         setTotalCount(count || 0);
       } catch (error) {
         console.error("Failed to fetch contacts:", error);
       } finally {
         setLoading(false);
       }
     };
 
     fetchContacts();
   }, [connectionId, page, search]);
 
   const totalPages = Math.ceil(totalCount / PAGE_SIZE);
 
   if (loading && contacts.length === 0) {
     return (
       <div className="flex items-center justify-center py-12">
         <Loader2 className="w-6 h-6 animate-spin text-primary" />
       </div>
     );
   }
 
   if (!loading && contacts.length === 0 && !search) {
     return (
       <div className="flex flex-col items-center justify-center py-12 text-center">
         <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
           <Users className="w-6 h-6 text-muted-foreground" />
         </div>
         <h3 className="font-medium text-foreground mb-1">No contacts synced</h3>
         <p className="text-sm text-muted-foreground">
           Contacts will appear here after the first sync.
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
           placeholder="Search by name or email..."
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
               <TableHead>Name</TableHead>
               <TableHead>Email</TableHead>
               <TableHead>Company</TableHead>
               <TableHead>Stage</TableHead>
               <TableHead>Source</TableHead>
               <TableHead>Created</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {contacts.map((contact) => (
               <TableRow key={contact.id}>
                 <TableCell className="font-medium">
                   {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
                 </TableCell>
                 <TableCell>{contact.email || "—"}</TableCell>
                 <TableCell>{contact.company_name || "—"}</TableCell>
                 <TableCell>
                   {contact.lifecycle_stage ? (
                     <Badge variant="secondary">{contact.lifecycle_stage}</Badge>
                   ) : (
                     "—"
                   )}
                 </TableCell>
                 <TableCell>
                   <Badge variant="outline">{contact.source}</Badge>
                 </TableCell>
                 <TableCell className="text-muted-foreground">
                   {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
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
         Showing {contacts.length} of {totalCount.toLocaleString()} contacts
       </p>
     </div>
   );
 };
 
 export default CrmContactsTab;