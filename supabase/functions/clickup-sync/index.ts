import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const { listIds, syncAll } = body;

    const { data: conn } = await supabase
      .from("clickup_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("connection_status", "active")
      .maybeSingle();

    if (!conn) throw new Error("No active ClickUp connection");

    const apiToken = conn.api_token;
    const headers = { Authorization: apiToken };

    // Get lists to sync
    let query = supabase
      .from("clickup_lists")
      .select("*")
      .eq("connection_id", conn.id);

    if (!syncAll && listIds?.length) {
      query = query.in("id", listIds);
    } else if (!syncAll) {
      query = query.eq("is_selected_for_sync", true);
    }

    const { data: lists } = await query;

    if (!lists?.length) {
      return new Response(JSON.stringify({ error: "No lists selected for sync", taskCount: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalTasks = 0;
    let totalAttachments = 0;

    for (const list of lists) {
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const tasksRes = await fetch(
          `https://api.clickup.com/api/v2/list/${list.clickup_list_id}/task?page=${page}&include_closed=true&subtasks=true`,
          { headers }
        );

        if (!tasksRes.ok) {
          console.error(`Failed to fetch tasks for list ${list.name}: ${tasksRes.status}`);
          break;
        }

        const tasksData = await tasksRes.json();
        const tasks = tasksData.tasks || [];

        if (tasks.length === 0) {
          hasMore = false;
          break;
        }

        for (const task of tasks) {
          const assignees = (task.assignees || []).map((a: any) => ({
            username: a.username,
            email: a.email,
            profilePicture: a.profilePicture,
          }));

          const tags = (task.tags || []).map((t: any) => t.name);

          // Upsert task
          const { data: existingTask } = await supabase
            .from("clickup_tasks")
            .select("id")
            .eq("connection_id", conn.id)
            .eq("clickup_task_id", task.id)
            .maybeSingle();

          const taskData = {
            user_id: user.id,
            connection_id: conn.id,
            clickup_task_id: task.id,
            clickup_list_id: list.clickup_list_id,
            list_name: list.name,
            title: task.name,
            description: task.description || task.text_content || null,
            status: task.status?.status || null,
            priority: task.priority?.priority || null,
            due_date: task.due_date ? new Date(parseInt(task.due_date)).toISOString() : null,
            start_date: task.start_date ? new Date(parseInt(task.start_date)).toISOString() : null,
            date_created: task.date_created ? new Date(parseInt(task.date_created)).toISOString() : null,
            assignees: JSON.stringify(assignees),
            tags: JSON.stringify(tags),
            url: task.url || null,
            raw: task,
            updated_at: new Date().toISOString(),
          };

          if (existingTask) {
            await supabase
              .from("clickup_tasks")
              .update(taskData)
              .eq("id", existingTask.id);
          } else {
            await supabase.from("clickup_tasks").insert(taskData);
          }

          totalTasks++;

          // Fetch attachments if task has them
          if (task.attachments?.length) {
            for (const att of task.attachments) {
              const { data: existingAtt } = await supabase
                .from("clickup_attachments")
                .select("id")
                .eq("connection_id", conn.id)
                .eq("clickup_task_id", task.id)
                .eq("file_name", att.title || att.name)
                .maybeSingle();

              if (!existingAtt) {
                await supabase.from("clickup_attachments").insert({
                  user_id: user.id,
                  connection_id: conn.id,
                  clickup_task_id: task.id,
                  task_title: task.name,
                  list_name: list.name,
                  file_name: att.title || att.name || "attachment",
                  file_url: att.url,
                  mime_type: att.extension ? `application/${att.extension}` : null,
                  size: att.size || null,
                });
                totalAttachments++;
              }
            }
          }
        }

        // ClickUp returns up to 100 tasks per page
        hasMore = tasks.length >= 100;
        page++;
      }

      // Update list sync timestamp and task count
      await supabase
        .from("clickup_lists")
        .update({
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", list.id);
    }

    // Update connection sync timestamp
    await supabase
      .from("clickup_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", conn.id);

    return new Response(JSON.stringify({
      success: true,
      taskCount: totalTasks,
      attachmentCount: totalAttachments,
      listsProcessed: lists.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("ClickUp sync error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
