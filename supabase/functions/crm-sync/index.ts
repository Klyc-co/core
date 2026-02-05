 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/encryption.ts";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 async function syncHubSpot(
   supabase: any,
   connection: any,
   accessToken: string,
   logId: string
 ) {
   let contactsImported = 0;
   let companiesImported = 0;
   let dealsImported = 0;
 
   try {
     // Fetch contacts
     const contactsResponse = await fetch(
       "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=email,firstname,lastname,phone,company,lifecyclestage",
       {
         headers: { Authorization: `Bearer ${accessToken}` },
       }
     );
 
     if (contactsResponse.ok) {
       const contactsData = await contactsResponse.json();
       for (const contact of contactsData.results || []) {
         await supabase.from("crm_contacts").upsert(
           {
             user_id: connection.user_id,
             connection_id: connection.id,
             external_id: contact.id,
             email: contact.properties?.email,
             first_name: contact.properties?.firstname,
             last_name: contact.properties?.lastname,
             phone: contact.properties?.phone,
             company_name: contact.properties?.company,
             lifecycle_stage: contact.properties?.lifecyclestage,
             source: "hubspot",
             raw_data: contact,
           },
           { onConflict: "connection_id,external_id" }
         );
         contactsImported++;
       }
     }
 
     // Fetch companies
     const companiesResponse = await fetch(
       "https://api.hubapi.com/crm/v3/objects/companies?limit=100&properties=name,domain,industry,numberofemployees",
       {
         headers: { Authorization: `Bearer ${accessToken}` },
       }
     );
 
     if (companiesResponse.ok) {
       const companiesData = await companiesResponse.json();
       for (const company of companiesData.results || []) {
         await supabase.from("crm_companies").upsert(
           {
             user_id: connection.user_id,
             connection_id: connection.id,
             external_id: company.id,
             name: company.properties?.name || "Unknown",
             domain: company.properties?.domain,
             industry: company.properties?.industry,
             size: company.properties?.numberofemployees,
             raw_data: company,
           },
           { onConflict: "connection_id,external_id" }
         );
         companiesImported++;
       }
     }
 
     // Fetch deals
     const dealsResponse = await fetch(
       "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,hubspot_owner_id",
       {
         headers: { Authorization: `Bearer ${accessToken}` },
       }
     );
 
     if (dealsResponse.ok) {
       const dealsData = await dealsResponse.json();
       for (const deal of dealsData.results || []) {
         await supabase.from("crm_deals").upsert(
           {
             user_id: connection.user_id,
             connection_id: connection.id,
             external_id: deal.id,
             name: deal.properties?.dealname || "Untitled Deal",
             stage: deal.properties?.dealstage,
             value: deal.properties?.amount ? parseFloat(deal.properties.amount) : null,
             close_date: deal.properties?.closedate,
             owner: deal.properties?.hubspot_owner_id,
             raw_data: deal,
           },
           { onConflict: "connection_id,external_id" }
         );
         dealsImported++;
       }
     }
 
     return {
       success: true,
       summary: `Imported ${contactsImported} contacts, ${companiesImported} companies, ${dealsImported} deals`,
       stats: {
         contacts_count: contactsImported,
         companies_count: companiesImported,
         deals_count: dealsImported,
       },
     };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}

async function syncSalesforce(
  supabase: any,
  connection: any,
  accessToken: string,
  logId: string
) {
  let contactsImported = 0;
  let accountsImported = 0;
  let opportunitiesImported = 0;

  const instanceUrl = (connection.metadata as { instance_url?: string })?.instance_url;
  if (!instanceUrl) {
    return { success: false, error: "Salesforce instance URL not found in metadata" };
  }

  try {
    // Fetch Contacts
    const contactsResponse = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(
        "SELECT Id, Email, FirstName, LastName, Phone, Account.Name, LeadSource FROM Contact LIMIT 100"
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();
      for (const contact of contactsData.records || []) {
        await supabase.from("crm_contacts").upsert(
          {
            user_id: connection.user_id,
            connection_id: connection.id,
            external_id: contact.Id,
            email: contact.Email,
            first_name: contact.FirstName,
            last_name: contact.LastName,
            phone: contact.Phone,
            company_name: contact.Account?.Name,
            source: "salesforce",
            raw_data: contact,
          },
          { onConflict: "connection_id,external_id" }
        );
        contactsImported++;
      }
    }

    // Fetch Accounts (Companies)
    const accountsResponse = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(
        "SELECT Id, Name, Website, Industry, NumberOfEmployees FROM Account LIMIT 100"
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (accountsResponse.ok) {
      const accountsData = await accountsResponse.json();
      for (const account of accountsData.records || []) {
        await supabase.from("crm_companies").upsert(
          {
            user_id: connection.user_id,
            connection_id: connection.id,
            external_id: account.Id,
            name: account.Name || "Unknown",
            domain: account.Website,
            industry: account.Industry,
            size: account.NumberOfEmployees ? String(account.NumberOfEmployees) : null,
            raw_data: account,
          },
          { onConflict: "connection_id,external_id" }
        );
        accountsImported++;
      }
    }

    // Fetch Opportunities (Deals)
    const opportunitiesResponse = await fetch(
      `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(
        "SELECT Id, Name, StageName, Amount, CloseDate, OwnerId FROM Opportunity LIMIT 100"
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (opportunitiesResponse.ok) {
      const opportunitiesData = await opportunitiesResponse.json();
      for (const opp of opportunitiesData.records || []) {
        await supabase.from("crm_deals").upsert(
          {
            user_id: connection.user_id,
            connection_id: connection.id,
            external_id: opp.Id,
            name: opp.Name || "Untitled Opportunity",
            stage: opp.StageName,
            value: opp.Amount ? parseFloat(opp.Amount) : null,
            close_date: opp.CloseDate,
            owner: opp.OwnerId,
            raw_data: opp,
          },
          { onConflict: "connection_id,external_id" }
        );
        opportunitiesImported++;
      }
    }

    return {
      success: true,
      summary: `Imported ${contactsImported} contacts, ${accountsImported} accounts, ${opportunitiesImported} opportunities`,
      stats: {
        contacts_count: contactsImported,
        companies_count: accountsImported,
        deals_count: opportunitiesImported,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
  }
}
 
 async function syncShopify(
   supabase: any,
   connection: any,
   accessToken: string,
   logId: string
 ) {
   let customersImported = 0;
   let ordersImported = 0;
 
   const shop = (connection.metadata as { shop?: string })?.shop;
   if (!shop) {
     return { success: false, error: "Shop domain not found in metadata" };
   }
 
   try {
     // Fetch customers
     const customersResponse = await fetch(
       `https://${shop}/admin/api/2024-01/customers.json?limit=250`,
       {
         headers: { "X-Shopify-Access-Token": accessToken },
       }
     );
 
     if (customersResponse.ok) {
       const customersData = await customersResponse.json();
       for (const customer of customersData.customers || []) {
         await supabase.from("crm_contacts").upsert(
           {
             user_id: connection.user_id,
             connection_id: connection.id,
             external_id: String(customer.id),
             email: customer.email,
             first_name: customer.first_name,
             last_name: customer.last_name,
             phone: customer.phone,
             lifecycle_stage: customer.state,
             tags: customer.tags ? customer.tags.split(",").map((t: string) => t.trim()) : [],
             source: "shopify",
             raw_data: customer,
           },
           { onConflict: "connection_id,external_id" }
         );
         customersImported++;
       }
     }
 
     // Fetch orders
     const ordersResponse = await fetch(
       `https://${shop}/admin/api/2024-01/orders.json?limit=250&status=any`,
       {
         headers: { "X-Shopify-Access-Token": accessToken },
       }
     );
 
     if (ordersResponse.ok) {
       const ordersData = await ordersResponse.json();
       for (const order of ordersData.orders || []) {
         await supabase.from("crm_orders").upsert(
           {
             user_id: connection.user_id,
             connection_id: connection.id,
             external_id: String(order.id),
             order_number: String(order.order_number),
             customer_email: order.email,
             customer_name: order.customer?.first_name
               ? `${order.customer.first_name} ${order.customer.last_name || ""}`.trim()
               : null,
             items: order.line_items?.map((item: any) => ({
               name: item.name,
               quantity: item.quantity,
               price: item.price,
             })),
             total_amount: order.total_price ? parseFloat(order.total_price) : null,
             currency: order.currency,
             status: order.fulfillment_status || order.financial_status,
             order_date: order.created_at,
             raw_data: order,
           },
           { onConflict: "connection_id,external_id" }
         );
         ordersImported++;
       }
     }
 
     return {
       success: true,
       summary: `Imported ${customersImported} customers, ${ordersImported} orders`,
       stats: {
         contacts_count: customersImported,
         orders_count: ordersImported,
       },
     };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message };
   }
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { connectionId } = await req.json();
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL") ?? "",
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
     );
 
     // Fetch connection
     const { data: connection, error: connError } = await supabase
       .from("crm_connections")
       .select("*")
       .eq("id", connectionId)
       .single();
 
     if (connError || !connection) {
       return new Response(
         JSON.stringify({ error: "Connection not found" }),
         {
           status: 404,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         }
       );
     }
 
     // Create sync log
     const { data: logData } = await supabase
       .from("crm_sync_logs")
       .insert({
         connection_id: connectionId,
         status: "running",
       })
       .select()
       .single();
 
     const logId = logData?.id;
 
     // Decrypt access token
    const accessToken = await decryptToken(connection.access_token);
 
     let result;
 
    if (connection.provider === "hubspot") {
      result = await syncHubSpot(supabase, connection, accessToken, logId);
    } else if (connection.provider === "shopify") {
      result = await syncShopify(supabase, connection, accessToken, logId);
    } else if (connection.provider === "salesforce") {
      result = await syncSalesforce(supabase, connection, accessToken, logId);
    } else {
      result = { success: false, error: `Unknown provider: ${connection.provider}` };
    }
 
     // Update sync log
     await supabase
       .from("crm_sync_logs")
       .update({
         finished_at: new Date().toISOString(),
         status: result.success ? "success" : "error",
         summary: result.summary,
         error_message: result.error,
       })
       .eq("id", logId);
 
     // Update connection status and metadata
     await supabase
       .from("crm_connections")
       .update({
         status: result.success ? "connected" : "error",
         last_sync_at: new Date().toISOString(),
         metadata: {
           ...connection.metadata,
           ...result.stats,
         },
       })
       .eq("id", connectionId);
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
  } catch (error: unknown) {
     console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
       status: 500,
       headers: { ...corsHeaders, "Content-Type": "application/json" },
     });
   }
 });