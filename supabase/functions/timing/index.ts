// ============================================================
// TIMING SUBMIND — Scheduling Optimization Engine
// Determines optimal publish times, plans cadence, manages
// 6-checkpoint measurement schedule. Only speaks KNP.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KNP_VERSION = "Ψ3";
const KNP_FIELD_SEPARATOR = "∷";
const KNP_VALUE_JOINER = "⊕";
const KNP_NULL_MARKER = "∅";

const KNP = {
  ξb: "ξb", ζq: "ζq", μp: "μp", θc: "θc", λv: "λv",
  κw: "κw", πf: "πf", σo: "σo",
} as const;

function knpChecksum(segments: Record<string, string>): string {
  let h = 0;
  const str = Object.entries(segments)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => k + v)
    .join("|");
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return "Ψ" + Math.abs(h).toString(36);
}

// ---- Platform Timing Defaults ----

interface TimingWindow {
  days: number[]; // 0=Sun, 1=Mon...6=Sat
  hours: number[][]; // pairs of [start, end] in local time
  maxPerDay: number;
  minSpacingHours: number;
}

const PLATFORM_TIMING: Record<string, TimingWindow> = {
  INSTAGRAM: {
    days: [2, 3, 4, 5], // Tue-Fri
    hours: [[8, 10], [18, 20]],
    maxPerDay: 2,
    minSpacingHours: 4,
  },
  TIKTOK: {
    days: [2, 4, 5], // Tue, Thu, Fri
    hours: [[7, 8], [12, 13], [19, 20]],
    maxPerDay: 3,
    minSpacingHours: 4,
  },
  LINKEDIN: {
    days: [2, 3, 4], // Tue-Thu
    hours: [[8, 10], [12, 13]],
    maxPerDay: 1,
    minSpacingHours: 24,
  },
  TWITTER: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    hours: [[8, 15]],
    maxPerDay: 3,
    minSpacingHours: 2,
  },
  FACEBOOK: {
    days: [3, 4, 5], // Wed-Fri
    hours: [[11, 14], [13, 16]],
    maxPerDay: 2,
    minSpacingHours: 4,
  },
  YOUTUBE: {
    days: [1, 2, 3, 4, 5], // Weekdays
    hours: [[12, 15], [17, 19]],
    maxPerDay: 1,
    minSpacingHours: 24,
  },
};

// ---- Checkpoint Generation ----

interface Checkpoint {
  label: string;
  offset_ms: number;
  timestamp: string;
}

function generateCheckpoints(launchTime: Date): Checkpoint[] {
  const offsets = [
    { label: "1m", ms: 60 * 1000 },
    { label: "5m", ms: 5 * 60 * 1000 },
    { label: "15m", ms: 15 * 60 * 1000 },
    { label: "30m", ms: 30 * 60 * 1000 },
    { label: "1h", ms: 60 * 60 * 1000 },
    { label: "2h", ms: 2 * 60 * 60 * 1000 },
  ];

  return offsets.map(({ label, ms }) => ({
    label,
    offset_ms: ms,
    timestamp: new Date(launchTime.getTime() + ms).toISOString(),
  }));
}

// ---- Optimal Slot Finder ----

interface ScheduledSlot {
  platform: string;
  publish_time: string;
  day_name: string;
  hour: number;
  timezone: string;
  is_primary_tz: boolean;
  post_index: number;
}

function findOptimalSlots(
  platforms: string[],
  postCount: number,
  startDate: Date,
  durationDays: number,
  timezone: string,
  constraints: string | null,
  personalizedTiming: Record<string, number[]> | null,
): ScheduledSlot[] {
  const slots: ScheduledSlot[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  let postIndex = 0;

  // Stagger platforms — don't launch everywhere simultaneously
  const platformDelay: Record<string, number> = {};
  platforms.forEach((p, i) => {
    platformDelay[p] = i * 2; // 2-hour stagger between platforms
  });

  for (const platform of platforms) {
    const timing = PLATFORM_TIMING[platform] || PLATFORM_TIMING.INSTAGRAM;
    let platformPostCount = Math.ceil(postCount / platforms.length);
    let currentDate = new Date(startDate);
    let postsScheduled = 0;

    // Use personalized timing if available
    const personalHours = personalizedTiming?.[platform.toLowerCase()];

    for (let day = 0; day < durationDays && postsScheduled < platformPostCount; day++) {
      const dayOfWeek = currentDate.getDay();

      if (timing.days.includes(dayOfWeek)) {
        const dailySlots = Math.min(
          timing.maxPerDay,
          platformPostCount - postsScheduled
        );

        // Pick hours
        const availableHours: number[] = personalHours ||
          timing.hours.flatMap(([s, e]) => {
            const hours: number[] = [];
            for (let h = s; h < e; h++) hours.push(h);
            return hours;
          });

        for (let s = 0; s < dailySlots && s < availableHours.length; s++) {
          const hour = availableHours[s % availableHours.length] + (platformDelay[platform] || 0);
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour % 24, 0, 0, 0);

          // Check constraints
          if (constraints && constraints !== KNP_NULL_MARKER) {
            const constraintLower = constraints.toLowerCase();
            if (constraintLower.includes("avoid weekend") && (dayOfWeek === 0 || dayOfWeek === 6)) {
              continue;
            }
          }

          slots.push({
            platform,
            publish_time: slotTime.toISOString(),
            day_name: dayNames[dayOfWeek],
            hour: hour % 24,
            timezone,
            is_primary_tz: true,
            post_index: postIndex++,
          });
          postsScheduled++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Sort by publish time
  slots.sort((a, b) => new Date(a.publish_time).getTime() - new Date(b.publish_time).getTime());
  return slots;
}

// ---- Build Human-Readable Schedule Summary ----

function buildScheduleSummary(slots: ScheduledSlot[]): string {
  if (slots.length === 0) return "No posts scheduled.";

  const lines: string[] = ["📅 Proposed Schedule:"];
  const byPlatform: Record<string, ScheduledSlot[]> = {};
  for (const s of slots) {
    if (!byPlatform[s.platform]) byPlatform[s.platform] = [];
    byPlatform[s.platform].push(s);
  }

  for (const [platform, platformSlots] of Object.entries(byPlatform)) {
    lines.push(`\n${platform} (${platformSlots.length} posts):`);
    for (const s of platformSlots) {
      const d = new Date(s.publish_time);
      lines.push(`  • ${s.day_name} ${d.toLocaleDateString()} at ${s.hour}:00 ${s.timezone}`);
    }
  }

  return lines.join("\n");
}

// ---- Main Handler ----

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const payload = await req.json();
    const segments = payload.segments || payload;

    const brief = segments[KNP.ξb] || segments.ξb || "";
    const platformsRaw = segments[KNP.μp] || segments.μp || KNP_NULL_MARKER;
    const clientId = segments[KNP.θc] || segments.θc || null;
    const cadenceRaw = segments[KNP.πf] || segments.πf || KNP_NULL_MARKER;
    const constraints = segments.zq || segments[KNP.ζq] || KNP_NULL_MARKER;

    const platforms = platformsRaw !== KNP_NULL_MARKER
      ? platformsRaw.split(KNP_VALUE_JOINER).map((p: string) => p.trim().toUpperCase()).filter(Boolean)
      : ["INSTAGRAM"];

    // Parse cadence goals
    let postCount = 3;
    let durationDays = 7;
    if (cadenceRaw !== KNP_NULL_MARKER) {
      const countMatch = cadenceRaw.match(/(\d+)\s*post/i);
      const dayMatch = cadenceRaw.match(/(\d+)\s*day/i);
      if (countMatch) postCount = parseInt(countMatch[1]);
      if (dayMatch) durationDays = parseInt(dayMatch[1]);
    }

    // Extract timezone from brief
    let timezone = "UTC";
    const tzMatch = brief.match(/(?:timezone|tz|time zone)[:\s]+([A-Z]{2,5}|[A-Za-z_/]+)/i);
    if (tzMatch) timezone = tzMatch[1];

    // Initialize Supabase & check Learning Engine data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let personalizedTiming: Record<string, number[]> | null = null;
    if (clientId) {
      const { data: brainData } = await supabase
        .from("client_brain")
        .select("data")
        .eq("client_id", clientId)
        .eq("document_type", "strategy_profile")
        .single();

      if (brainData?.data) {
        const strategy = brainData.data as Record<string, unknown>;
        if (strategy.optimal_posting_times) {
          personalizedTiming = strategy.optimal_posting_times as Record<string, number[]>;
        }
      }
    }

    // Calculate start date (next day from now)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);

    // Find optimal slots
    const slots = findOptimalSlots(
      platforms, postCount, startDate, durationDays,
      timezone, constraints !== KNP_NULL_MARKER ? constraints : null,
      personalizedTiming,
    );

    // Generate checkpoints for the first publish time
    const firstLaunch = slots.length > 0 ? new Date(slots[0].publish_time) : startDate;
    const checkpoints = generateCheckpoints(firstLaunch);

    // Build cadence recommendations
    const cadenceRecs: string[] = [];
    for (const p of platforms) {
      const timing = PLATFORM_TIMING[p];
      if (timing) {
        cadenceRecs.push(
          `${p}: max ${timing.maxPerDay}/day, min ${timing.minSpacingHours}h spacing`
        );
      }
    }
    if (platforms.length > 1) {
      cadenceRecs.push("Stagger platform launches by 2h for momentum building");
    }
    cadenceRecs.push("Content arc: Hook → Build narrative → Drive CTA");

    // Build schedule summary for approval
    const scheduleSummary = buildScheduleSummary(slots);

    // Build KNP response
    const slotsEncoded = slots.map((s) =>
      `${s.platform}${KNP_FIELD_SEPARATOR}${s.publish_time}${KNP_FIELD_SEPARATOR}${s.day_name}${KNP_FIELD_SEPARATOR}${s.hour}:00`
    ).join(KNP_VALUE_JOINER);

    const checkpointsEncoded = checkpoints.map((c) =>
      `${c.label}${KNP_FIELD_SEPARATOR}${c.timestamp}`
    ).join(KNP_VALUE_JOINER);

    const responseSegments: Record<string, string> = {
      [KNP.σo]: slotsEncoded || KNP_NULL_MARKER,
      [KNP.λv]: cadenceRecs.join(KNP_VALUE_JOINER),
      [KNP.πf]: checkpointsEncoded,
      [`${KNP.θc}${KNP_FIELD_SEPARATOR}SCHEDULE_READY`]: KNP_NULL_MARKER,
    };

    const elapsed = Date.now() - startTime;

    const response = {
      version: KNP_VERSION,
      submind: "timing",
      status: "complete",
      checksum: knpChecksum(responseSegments),
      timestamp: Date.now(),
      ...responseSegments,
      // Structured data for Orchestrator
      scheduled_slots: slots,
      checkpoints,
      cadence_recommendations: cadenceRecs,
      schedule_summary: scheduleSummary,
      schedule_ready: true,
      timezone,
      platforms_scheduled: platforms,
      total_posts: slots.length,
      duration_days: durationDays,
      elapsed_ms: elapsed,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Timing submind error:", e);
    const errorSegments: Record<string, string> = {
      [KNP.σo]: KNP_NULL_MARKER,
      [KNP.λv]: KNP_NULL_MARKER,
      [KNP.πf]: KNP_NULL_MARKER,
    };
    return new Response(
      JSON.stringify({
        version: KNP_VERSION,
        submind: "timing",
        status: "error",
        checksum: knpChecksum(errorSegments),
        ...errorSegments,
        error: e instanceof Error ? e.message : "Unknown error",
        elapsed_ms: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
