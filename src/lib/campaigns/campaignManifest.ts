import { getTemplatesForPlatform } from "@/lib/agents";
import type { SocialPlatform } from "@/lib/agents";

// ============================================================
// KLYC Campaign Manifest System
// Defines the full campaign structure before content generation.
// ============================================================

export interface CampaignCadence {
  posts_per_day: number;
  days_of_week: string[];
  blackout_dates: string[];
}

export interface ScheduledPost {
  post_id: string;
  platform: string;
  publish_time: string;
  structure: string;
  variation_index: number;
}

export interface CampaignManifest {
  campaign_id: string;
  client_id: string;
  campaign_goal: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  timezone: string;
  cadence: CampaignCadence;
  structures: Record<string, string[]>;
  variation_count: number;
  total_posts: number;
  schedule: ScheduledPost[];
  generated_at: string;
}

export interface ManifestInput {
  clientId: string;
  campaignGoal: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  timezone?: string;
  postsPerDay: number;
  daysOfWeek?: string[];
  blackoutDates?: string[];
  variationCount?: number;
}

const DEFAULT_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const DEFAULT_VARIATION_COUNT = 3;

const PLATFORM_POST_TIMES: Record<string, string[]> = {
  linkedin:  ["08:00", "12:00", "17:30"],
  twitter:   ["07:00", "12:30", "17:00", "20:00"],
  instagram: ["09:00", "12:00", "18:00", "21:00"],
  tiktok:    ["10:00", "14:00", "19:00", "21:30"],
  youtube:   ["10:00", "15:00"],
  facebook:  ["09:00", "13:00", "16:00"],
};

/**
 * Calculate the total number of posts for a campaign.
 */
export function calculateTotalPosts(
  platforms: string[],
  startDate: string,
  endDate: string,
  postsPerDay: number,
  daysOfWeek: string[],
  blackoutDates: string[]
): number {
  const publishDays = getPublishDays(startDate, endDate, daysOfWeek, blackoutDates);
  return publishDays.length * postsPerDay * platforms.length;
}

/**
 * Build the ordered schedule of posts across platforms and dates.
 */
export function createSchedule(
  platforms: string[],
  startDate: string,
  endDate: string,
  postsPerDay: number,
  daysOfWeek: string[],
  blackoutDates: string[],
  structures: Record<string, string[]>,
  variationCount: number,
  timezone: string
): ScheduledPost[] {
  const publishDays = getPublishDays(startDate, endDate, daysOfWeek, blackoutDates);
  const schedule: ScheduledPost[] = [];
  let postCounter = 0;

  for (const day of publishDays) {
    for (const platform of platforms) {
      const times = pickTimes(platform, postsPerDay);
      const platformStructures = structures[platform] || [];

      for (let i = 0; i < postsPerDay; i++) {
        const structureIndex = postCounter % Math.max(platformStructures.length, 1);
        const structure = platformStructures[structureIndex] || "default";
        const variationIndex = postCounter % variationCount;

        schedule.push({
          post_id: `post_${day.replace(/-/g, "")}_${platform}_${i}`,
          platform,
          publish_time: `${day}T${times[i]}:00${formatTzOffset(timezone)}`,
          structure,
          variation_index: variationIndex,
        });
        postCounter++;
      }
    }
  }

  return schedule;
}

/**
 * Generate a complete campaign manifest from inputs.
 * The orchestrator calls this before dispatching agents.
 */
export function generateCampaignManifest(input: ManifestInput): CampaignManifest {
  const {
    clientId,
    campaignGoal,
    platforms,
    startDate,
    endDate,
    timezone = "UTC",
    postsPerDay,
    daysOfWeek = DEFAULT_DAYS,
    blackoutDates = [],
    variationCount = DEFAULT_VARIATION_COUNT,
  } = input;

  // Resolve structures per platform from the template library
  const structures: Record<string, string[]> = {};
  for (const platform of platforms) {
    const templates = getTemplatesForPlatform(platform as SocialPlatform);
    structures[platform] = templates.map((t) => t.structure);
  }

  const totalPosts = calculateTotalPosts(
    platforms, startDate, endDate, postsPerDay, daysOfWeek, blackoutDates
  );

  const schedule = createSchedule(
    platforms, startDate, endDate, postsPerDay,
    daysOfWeek, blackoutDates, structures, variationCount, timezone
  );

  return {
    campaign_id: `cmp_${Date.now().toString(36)}_${randomSuffix()}`,
    client_id: clientId,
    campaign_goal: campaignGoal,
    platforms,
    start_date: startDate,
    end_date: endDate,
    timezone,
    cadence: {
      posts_per_day: postsPerDay,
      days_of_week: daysOfWeek,
      blackout_dates: blackoutDates,
    },
    structures,
    variation_count: variationCount,
    total_posts: totalPosts,
    schedule,
    generated_at: new Date().toISOString(),
  };
}

// ---- Internal helpers ----

function getPublishDays(
  startDate: string,
  endDate: string,
  daysOfWeek: string[],
  blackoutDates: string[]
): string[] {
  const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const allowedDays = new Set(daysOfWeek.map((d) => d.toLowerCase()));
  const blackoutSet = new Set(blackoutDates);
  const days: string[] = [];

  const current = new Date(startDate + "T00:00:00Z");
  const end = new Date(endDate + "T00:00:00Z");

  while (current <= end) {
    const iso = current.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[current.getUTCDay()];
    if (allowedDays.has(dayName) && !blackoutSet.has(iso)) {
      days.push(iso);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function pickTimes(platform: string, count: number): string[] {
  const pool = PLATFORM_POST_TIMES[platform] || ["09:00", "12:00", "18:00"];
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    times.push(pool[i % pool.length]);
  }
  return times;
}

function formatTzOffset(tz: string): string {
  if (tz === "UTC" || tz === "utc") return "Z";
  // For named timezones, return empty and let consumers handle conversion
  return "";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
