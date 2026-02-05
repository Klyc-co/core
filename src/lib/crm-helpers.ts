 import { supabase } from "@/integrations/supabase/client";
 
 export interface CrmSummary {
   totalContacts: number;
   totalCompanies: number;
   totalDeals: number;
   totalOrders: number;
   totalRevenue: number;
   recentContactsCount: number;
   connections: {
     id: string;
     provider: string;
     displayName: string;
     status: string;
   }[];
 }
 
 export interface CrmContactFilters {
   lifecycleStage?: string;
   source?: string;
   search?: string;
   limit?: number;
   offset?: number;
 }
 
 export interface CrmDealFilters {
   stage?: string;
   status?: string;
   minValue?: number;
   maxValue?: number;
   limit?: number;
   offset?: number;
 }
 
 /**
  * Get a summary of all CRM data for a brand/user
  */
 export async function getBrandCrmSummary(userId: string): Promise<CrmSummary | null> {
   try {
     // Fetch all data in parallel
     const [connectionsRes, contactsRes, companiesRes, dealsRes, ordersRes] = await Promise.all([
       supabase
         .from("crm_connections")
         .select("id, provider, display_name, status")
         .eq("user_id", userId),
       supabase
         .from("crm_contacts")
         .select("id", { count: "exact", head: true })
         .eq("user_id", userId),
       supabase
         .from("crm_companies")
         .select("id", { count: "exact", head: true })
         .eq("user_id", userId),
       supabase
         .from("crm_deals")
         .select("id, value", { count: "exact" })
         .eq("user_id", userId),
       supabase
         .from("crm_orders")
         .select("id, total_amount", { count: "exact" })
         .eq("user_id", userId),
     ]);
 
     // Calculate total revenue from deals and orders
     const dealRevenue = (dealsRes.data || []).reduce(
       (sum, deal) => sum + (deal.value || 0),
       0
     );
     const orderRevenue = (ordersRes.data || []).reduce(
       (sum, order) => sum + (order.total_amount || 0),
       0
     );
 
     // Get recent contacts count (last 30 days)
     const thirtyDaysAgo = new Date();
     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
     const recentContactsRes = await supabase
       .from("crm_contacts")
       .select("id", { count: "exact", head: true })
       .eq("user_id", userId)
       .gte("created_at", thirtyDaysAgo.toISOString());
 
     return {
       totalContacts: contactsRes.count || 0,
       totalCompanies: companiesRes.count || 0,
       totalDeals: dealsRes.count || 0,
       totalOrders: ordersRes.count || 0,
       totalRevenue: dealRevenue + orderRevenue,
       recentContactsCount: recentContactsRes.count || 0,
       connections: (connectionsRes.data || []).map((c) => ({
         id: c.id,
         provider: c.provider,
         displayName: c.display_name,
         status: c.status,
       })),
     };
   } catch (error) {
     console.error("Failed to get CRM summary:", error);
     return null;
   }
 }
 
 /**
  * Get CRM contacts with optional filtering
  */
 export async function getBrandCrmContacts(
   userId: string,
   filters: CrmContactFilters = {}
 ) {
   const { lifecycleStage, source, search, limit = 100, offset = 0 } = filters;
 
   let query = supabase
     .from("crm_contacts")
     .select("*", { count: "exact" })
     .eq("user_id", userId)
     .order("created_at", { ascending: false })
     .range(offset, offset + limit - 1);
 
   if (lifecycleStage) {
     query = query.eq("lifecycle_stage", lifecycleStage);
   }
 
   if (source) {
     query = query.eq("source", source);
   }
 
   if (search) {
     query = query.or(
       `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
     );
   }
 
   const { data, error, count } = await query;
 
   if (error) {
     console.error("Failed to fetch CRM contacts:", error);
     return { contacts: [], total: 0 };
   }
 
   return { contacts: data || [], total: count || 0 };
 }
 
 /**
  * Get CRM deals with optional filtering
  */
 export async function getBrandCrmDeals(
   userId: string,
   filters: CrmDealFilters = {}
 ) {
   const { stage, status, minValue, maxValue, limit = 100, offset = 0 } = filters;
 
   let query = supabase
     .from("crm_deals")
     .select("*", { count: "exact" })
     .eq("user_id", userId)
     .order("created_at", { ascending: false })
     .range(offset, offset + limit - 1);
 
   if (stage) {
     query = query.eq("stage", stage);
   }
 
   if (status) {
     query = query.eq("status", status);
   }
 
   if (minValue !== undefined) {
     query = query.gte("value", minValue);
   }
 
   if (maxValue !== undefined) {
     query = query.lte("value", maxValue);
   }
 
   const { data, error, count } = await query;
 
   if (error) {
     console.error("Failed to fetch CRM deals:", error);
     return { deals: [], total: 0 };
   }
 
   return { deals: data || [], total: count || 0 };
 }
 
 /**
  * Get CRM orders with optional filtering
  */
 export async function getBrandCrmOrders(
   userId: string,
   filters: { status?: string; daysBack?: number; limit?: number; offset?: number } = {}
 ) {
   const { status, daysBack, limit = 100, offset = 0 } = filters;
 
   let query = supabase
     .from("crm_orders")
     .select("*", { count: "exact" })
     .eq("user_id", userId)
     .order("order_date", { ascending: false })
     .range(offset, offset + limit - 1);
 
   if (status) {
     query = query.eq("status", status);
   }
 
   if (daysBack) {
     const startDate = new Date();
     startDate.setDate(startDate.getDate() - daysBack);
     query = query.gte("order_date", startDate.toISOString());
   }
 
   const { data, error, count } = await query;
 
   if (error) {
     console.error("Failed to fetch CRM orders:", error);
     return { orders: [], total: 0 };
   }
 
   return { orders: data || [], total: count || 0 };
 }
 
 /**
  * Get unique lifecycle stages from contacts
  */
 export async function getCrmLifecycleStages(userId: string): Promise<string[]> {
   const { data, error } = await supabase
     .from("crm_contacts")
     .select("lifecycle_stage")
     .eq("user_id", userId)
     .not("lifecycle_stage", "is", null);
 
   if (error) {
     console.error("Failed to fetch lifecycle stages:", error);
     return [];
   }
 
   const stages = new Set(data.map((d) => d.lifecycle_stage).filter(Boolean));
   return Array.from(stages) as string[];
 }
 
 /**
  * Get unique deal stages
  */
 export async function getCrmDealStages(userId: string): Promise<string[]> {
   const { data, error } = await supabase
     .from("crm_deals")
     .select("stage")
     .eq("user_id", userId)
     .not("stage", "is", null);
 
   if (error) {
     console.error("Failed to fetch deal stages:", error);
     return [];
   }
 
   const stages = new Set(data.map((d) => d.stage).filter(Boolean));
   return Array.from(stages) as string[];
 }