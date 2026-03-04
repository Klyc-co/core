import { supabase } from "@/integrations/supabase/client";
import type { GeneratedPost, GeneratedContent } from "@/lib/agents/batchGenerator";

// ============================================================
// KLYC Publishing Queue
// Queues generated posts for timed publishing across platforms.
// ============================================================

export type PublishStatus = "queued" | "scheduled" | "published" | "failed";

export interface PublishJob {
  job_id: string;
  post_id: string;
  platform: string;
  scheduled_time: string;
  content: GeneratedContent;
  status: PublishStatus;
  error?: string;
  attempts: number;
  created_at: string;
  updated_at: string;
}

export interface EnqueueResult {
  job: PublishJob;
  persisted: boolean;
}

export interface ScheduleResult {
  total: number;
  scheduled: number;
  errors: string[];
}

export interface ProcessResult {
  processed: number;
  published: number;
  failed: number;
  skipped: number;
  results: Array<{ job_id: string; status: PublishStatus; error?: string }>;
}

// In-memory queue (supplements the persisted post_queue table)
const localQueue: Map<string, PublishJob> = new Map();

/**
 * Enqueue a single generated post for publishing.
 * Persists to the post_queue table and keeps a local reference.
 */
export async function enqueuePost(
  post: GeneratedPost,
  userId: string,
  clientId?: string,
  campaignDraftId?: string
): Promise<EnqueueResult> {
  const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const job: PublishJob = {
    job_id: jobId,
    post_id: post.post_id,
    platform: post.platform,
    scheduled_time: post.publish_time,
    content: post.content,
    status: "queued",
    attempts: 0,
    created_at: now,
    updated_at: now,
  };

  // Persist to post_queue
  const { error } = await supabase.from("post_queue").insert({
    user_id: userId,
    client_id: clientId || null,
    campaign_draft_id: campaignDraftId || null,
    content_type: inferContentType(post.content),
    post_text: post.content.full_text,
    status: "draft",
    scheduled_at: post.publish_time,
  });

  if (error) {
    console.error("Failed to persist post to queue:", error.message);
    localQueue.set(jobId, job);
    return { job, persisted: false };
  }

  localQueue.set(jobId, job);
  return { job, persisted: true };
}

/**
 * Bulk-enqueue posts from a batch result and mark them as scheduled.
 */
export async function schedulePosts(
  posts: GeneratedPost[],
  userId: string,
  clientId?: string,
  campaignDraftId?: string
): Promise<ScheduleResult> {
  const errors: string[] = [];
  let scheduled = 0;

  // Insert all posts into post_queue in one batch
  const rows = posts.map((p) => ({
    user_id: userId,
    client_id: clientId || null,
    campaign_draft_id: campaignDraftId || null,
    content_type: inferContentType(p.content),
    post_text: p.content.full_text,
    status: "scheduled",
    scheduled_at: p.publish_time,
  }));

  const { data, error } = await supabase
    .from("post_queue")
    .insert(rows)
    .select("id");

  if (error) {
    errors.push(`Batch insert failed: ${error.message}`);
  }

  const insertedIds = data || [];

  // Create local jobs and platform targets
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const queueRow = insertedIds[i];
    const jobId = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const job: PublishJob = {
      job_id: jobId,
      post_id: post.post_id,
      platform: post.platform,
      scheduled_time: post.publish_time,
      content: post.content,
      status: "scheduled",
      attempts: 0,
      created_at: now,
      updated_at: now,
    };

    localQueue.set(jobId, job);

    // Create platform target if row was persisted
    if (queueRow?.id) {
      const { error: targetError } = await supabase
        .from("post_platform_targets")
        .insert({
          post_queue_id: queueRow.id,
          platform: post.platform,
          status: "pending",
        });

      if (targetError) {
        errors.push(`Platform target for ${post.post_id}: ${targetError.message}`);
      } else {
        scheduled++;
      }
    }
  }

  return { total: posts.length, scheduled, errors };
}

/**
 * Process the queue: publish posts whose scheduled_time has been reached.
 * Calls the publish-post edge function for each ready post.
 */
export async function processQueue(userId: string): Promise<ProcessResult> {
  const now = new Date().toISOString();

  // Fetch posts that are scheduled and due
  const { data: duePosts, error } = await supabase
    .from("post_queue")
    .select("id, post_text, content_type, scheduled_at, status, image_url, video_url, media_urls")
    .eq("user_id", userId)
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Failed to fetch due posts:", error.message);
    return { processed: 0, published: 0, failed: 0, skipped: 0, results: [] };
  }

  const posts = duePosts || [];
  const results: ProcessResult["results"] = [];
  let published = 0;
  let failed = 0;
  let skipped = 0;

  for (const post of posts) {
    // Fetch platform targets for this post
    const { data: targets } = await supabase
      .from("post_platform_targets")
      .select("id, platform, status")
      .eq("post_queue_id", post.id)
      .eq("status", "pending");

    if (!targets || targets.length === 0) {
      skipped++;
      results.push({ job_id: post.id, status: "queued" });
      continue;
    }

    // Mark post as publishing
    await supabase
      .from("post_queue")
      .update({ status: "publishing", updated_at: new Date().toISOString() })
      .eq("id", post.id);

    let postPublished = false;

    for (const target of targets) {
      try {
        const { error: fnError } = await supabase.functions.invoke("publish-post", {
          body: {
            postQueueId: post.id,
            platform: target.platform,
          },
        });

        if (fnError) {
          await supabase
            .from("post_platform_targets")
            .update({ status: "failed", error_message: fnError.message })
            .eq("id", target.id);
        } else {
          postPublished = true;
        }
      } catch (err: any) {
        await supabase
          .from("post_platform_targets")
          .update({ status: "failed", error_message: err?.message || "Unknown error" })
          .eq("id", target.id);
      }
    }

    const finalStatus: PublishStatus = postPublished ? "published" : "failed";

    await supabase
      .from("post_queue")
      .update({
        status: finalStatus,
        published_at: postPublished ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (postPublished) published++;
    else failed++;

    results.push({ job_id: post.id, status: finalStatus });

    // Sync local queue
    for (const [key, job] of localQueue) {
      if (job.post_id === post.id) {
        job.status = finalStatus;
        job.updated_at = new Date().toISOString();
      }
    }
  }

  return { processed: posts.length, published, failed, skipped, results };
}

// ---- Helpers ----

function inferContentType(content: GeneratedContent): string {
  if (content.full_text && content.full_text.length > 0) return "text";
  return "text";
}

/**
 * Get all jobs currently in the local queue.
 */
export function getLocalQueue(): PublishJob[] {
  return Array.from(localQueue.values());
}

/**
 * Clear completed/failed jobs from local queue.
 */
export function clearCompleted(): number {
  let cleared = 0;
  for (const [key, job] of localQueue) {
    if (job.status === "published" || job.status === "failed") {
      localQueue.delete(key);
      cleared++;
    }
  }
  return cleared;
}
