// ============================================================
// KLYC Social Agent — Platform Structure Templates
// Reusable library of proven content structures per platform.
// Update templates here without changing agent prompts.
// ============================================================

export interface ContentStructureTemplate {
  platform: SocialPlatform;
  structure: string;
  label: string;
  description: string;
  hook_type: HookType;
  post_structure: string[];
  cta_pattern: CtaPattern;
  hashtag_pattern: HashtagPattern;
  character_limits: CharacterLimits;
}

export type SocialPlatform = "linkedin" | "twitter" | "instagram" | "tiktok" | "youtube";

export type HookType =
  | "question"
  | "bold_claim"
  | "statistic"
  | "story_opener"
  | "pattern_interrupt"
  | "controversial_take"
  | "curiosity_gap"
  | "direct_address";

export interface CtaPattern {
  style: "soft" | "direct" | "conversational" | "urgency" | "value_exchange";
  position: "end" | "inline" | "ps_line";
  examples: string[];
}

export interface HashtagPattern {
  count: number;
  placement: "inline" | "end" | "first_comment" | "none";
  mix: { branded: number; niche: number; broad: number };
}

export interface CharacterLimits {
  ideal_min: number;
  ideal_max: number;
  absolute_max: number;
}

export interface StructureVariation {
  variationId: string;
  templateStructure: string;
  platform: SocialPlatform;
  sections: VariationSection[];
  tone: string;
}

export interface VariationSection {
  role: string;
  instruction: string;
  example_snippet: string;
}

// ============================================================
// LINKEDIN — Top 5 Structures
// ============================================================

const LINKEDIN_TEMPLATES: ContentStructureTemplate[] = [
  {
    platform: "linkedin",
    structure: "authority_breakdown",
    label: "Authority Breakdown",
    description: "Establish expertise by dissecting a topic into actionable insights.",
    hook_type: "bold_claim",
    post_structure: ["strong_hook", "problem_statement", "insight", "actionable_takeaway", "cta"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["What's your take? Drop it below 👇", "Agree or disagree? Tell me why.", "Save this for your next strategy session."],
    },
    hashtag_pattern: { count: 3, placement: "end", mix: { branded: 1, niche: 1, broad: 1 } },
    character_limits: { ideal_min: 800, ideal_max: 1800, absolute_max: 3000 },
  },
  {
    platform: "linkedin",
    structure: "personal_story_lesson",
    label: "Personal Story → Lesson",
    description: "Share a real experience that transitions into a professional insight.",
    hook_type: "story_opener",
    post_structure: ["vulnerable_hook", "story_context", "turning_point", "lesson_extracted", "universal_takeaway", "engagement_question"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["Has this happened to you?", "What would you have done differently?", "Share your story below — I'd love to hear it."],
    },
    hashtag_pattern: { count: 3, placement: "end", mix: { branded: 0, niche: 2, broad: 1 } },
    character_limits: { ideal_min: 900, ideal_max: 2000, absolute_max: 3000 },
  },
  {
    platform: "linkedin",
    structure: "listicle_insights",
    label: "Listicle Insights",
    description: "Numbered list of tips, mistakes, or lessons — highly scannable.",
    hook_type: "curiosity_gap",
    post_structure: ["hook_with_number", "list_item_1", "list_item_2", "list_item_3", "list_item_4", "list_item_5", "summary_line", "cta"],
    cta_pattern: {
      style: "value_exchange",
      position: "end",
      examples: ["♻️ Repost if this helped someone in your network.", "Follow for more breakdowns like this.", "Which one resonates most? Comment the number."],
    },
    hashtag_pattern: { count: 4, placement: "end", mix: { branded: 1, niche: 2, broad: 1 } },
    character_limits: { ideal_min: 600, ideal_max: 1500, absolute_max: 3000 },
  },
  {
    platform: "linkedin",
    structure: "contrarian_take",
    label: "Contrarian Take",
    description: "Challenge a popular belief to spark debate and high engagement.",
    hook_type: "controversial_take",
    post_structure: ["provocative_claim", "conventional_wisdom", "evidence_against", "reframe", "new_perspective", "open_question"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["Unpopular opinion? Maybe. But the data says otherwise.", "Fight me in the comments 😄", "Tell me where I'm wrong."],
    },
    hashtag_pattern: { count: 2, placement: "end", mix: { branded: 0, niche: 1, broad: 1 } },
    character_limits: { ideal_min: 500, ideal_max: 1200, absolute_max: 3000 },
  },
  {
    platform: "linkedin",
    structure: "framework_reveal",
    label: "Framework / Model Reveal",
    description: "Introduce a proprietary framework or mental model with clear steps.",
    hook_type: "pattern_interrupt",
    post_structure: ["hook_with_result", "problem_it_solves", "framework_name", "step_1", "step_2", "step_3", "proof_point", "cta"],
    cta_pattern: {
      style: "value_exchange",
      position: "end",
      examples: ["Want the full playbook? Comment 'FRAMEWORK' and I'll DM it.", "Save this post — you'll need it.", "Follow for more frameworks like this."],
    },
    hashtag_pattern: { count: 3, placement: "end", mix: { branded: 1, niche: 1, broad: 1 } },
    character_limits: { ideal_min: 700, ideal_max: 1600, absolute_max: 3000 },
  },
];

// ============================================================
// TWITTER / X — Top 5 Structures
// ============================================================

const TWITTER_TEMPLATES: ContentStructureTemplate[] = [
  {
    platform: "twitter",
    structure: "hot_take_thread",
    label: "Hot Take (Single Tweet)",
    description: "One sharp, opinionated tweet that demands a reaction.",
    hook_type: "controversial_take",
    post_structure: ["bold_statement", "supporting_line", "mic_drop_or_question"],
    cta_pattern: {
      style: "conversational",
      position: "inline",
      examples: ["RT if you agree.", "Thoughts?", "The replies are gonna be wild."],
    },
    hashtag_pattern: { count: 1, placement: "inline", mix: { branded: 0, niche: 1, broad: 0 } },
    character_limits: { ideal_min: 80, ideal_max: 240, absolute_max: 280 },
  },
  {
    platform: "twitter",
    structure: "value_bomb",
    label: "Value Bomb",
    description: "One immediately useful tip or insight — high save potential.",
    hook_type: "direct_address",
    post_structure: ["direct_hook", "single_insight", "how_to_apply"],
    cta_pattern: {
      style: "soft",
      position: "end",
      examples: ["Bookmark this.", "You're welcome.", "Steal this."],
    },
    hashtag_pattern: { count: 0, placement: "none", mix: { branded: 0, niche: 0, broad: 0 } },
    character_limits: { ideal_min: 60, ideal_max: 200, absolute_max: 280 },
  },
  {
    platform: "twitter",
    structure: "thread_breakdown",
    label: "Thread Breakdown",
    description: "Multi-tweet thread that unpacks a complex topic.",
    hook_type: "curiosity_gap",
    post_structure: ["hook_tweet", "context_tweet", "point_1", "point_2", "point_3", "summary_tweet", "cta_tweet"],
    cta_pattern: {
      style: "value_exchange",
      position: "end",
      examples: ["If this helped, RT the first tweet.", "Follow for more threads like this.", "Like + Bookmark to save for later."],
    },
    hashtag_pattern: { count: 1, placement: "end", mix: { branded: 0, niche: 1, broad: 0 } },
    character_limits: { ideal_min: 200, ideal_max: 1800, absolute_max: 280 },
  },
  {
    platform: "twitter",
    structure: "engagement_question",
    label: "Engagement Question",
    description: "A simple question designed to maximize replies.",
    hook_type: "question",
    post_structure: ["question", "optional_context"],
    cta_pattern: {
      style: "conversational",
      position: "inline",
      examples: ["Reply with yours 👇", "Wrong answers only.", "One word answers."],
    },
    hashtag_pattern: { count: 0, placement: "none", mix: { branded: 0, niche: 0, broad: 0 } },
    character_limits: { ideal_min: 30, ideal_max: 140, absolute_max: 280 },
  },
  {
    platform: "twitter",
    structure: "before_after",
    label: "Before → After",
    description: "Show a transformation or comparison in minimal words.",
    hook_type: "pattern_interrupt",
    post_structure: ["before_state", "separator", "after_state", "punchline"],
    cta_pattern: {
      style: "soft",
      position: "end",
      examples: ["Which side are you on?", "The difference is one decision.", "RT if you've been there."],
    },
    hashtag_pattern: { count: 0, placement: "none", mix: { branded: 0, niche: 0, broad: 0 } },
    character_limits: { ideal_min: 50, ideal_max: 200, absolute_max: 280 },
  },
];

// ============================================================
// INSTAGRAM — Top 5 Structures
// ============================================================

const INSTAGRAM_TEMPLATES: ContentStructureTemplate[] = [
  {
    platform: "instagram",
    structure: "carousel_education",
    label: "Carousel Education",
    description: "Slide-by-slide educational content — highest save rate format.",
    hook_type: "curiosity_gap",
    post_structure: ["cover_slide_hook", "problem_slide", "solution_slide_1", "solution_slide_2", "solution_slide_3", "summary_slide", "cta_slide"],
    cta_pattern: {
      style: "value_exchange",
      position: "end",
      examples: ["Save this for later 🔖", "Share with someone who needs this", "Follow @handle for more"],
    },
    hashtag_pattern: { count: 15, placement: "first_comment", mix: { branded: 2, niche: 8, broad: 5 } },
    character_limits: { ideal_min: 100, ideal_max: 800, absolute_max: 2200 },
  },
  {
    platform: "instagram",
    structure: "reel_hook_value_cta",
    label: "Reel: Hook → Value → CTA",
    description: "Short-form video optimized for Reels algorithm.",
    hook_type: "pattern_interrupt",
    post_structure: ["visual_hook_0_3s", "problem_statement_3_8s", "solution_reveal_8_20s", "proof_or_demo_20_45s", "cta_overlay_last_5s"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Follow for part 2", "Link in bio", "Comment 'GUIDE' for the free download"],
    },
    hashtag_pattern: { count: 10, placement: "end", mix: { branded: 1, niche: 5, broad: 4 } },
    character_limits: { ideal_min: 50, ideal_max: 300, absolute_max: 2200 },
  },
  {
    platform: "instagram",
    structure: "storytelling_caption",
    label: "Storytelling Caption",
    description: "Long-form caption that tells a compelling story beneath the image.",
    hook_type: "story_opener",
    post_structure: ["opening_line_hook", "story_setup", "conflict_or_challenge", "resolution", "lesson_or_reflection", "question_for_audience"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["Tell me your story in the comments 💬", "Double tap if you relate ❤️", "Tag someone who needs to hear this"],
    },
    hashtag_pattern: { count: 20, placement: "first_comment", mix: { branded: 2, niche: 10, broad: 8 } },
    character_limits: { ideal_min: 400, ideal_max: 1500, absolute_max: 2200 },
  },
  {
    platform: "instagram",
    structure: "social_proof_showcase",
    label: "Social Proof Showcase",
    description: "Highlight results, testimonials, or transformations.",
    hook_type: "statistic",
    post_structure: ["result_hook", "context_and_challenge", "approach_taken", "result_details", "testimonial_quote", "cta"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["DM us 'RESULTS' to get started", "Link in bio for the full case study", "Want this for your brand? Let's talk 👇"],
    },
    hashtag_pattern: { count: 12, placement: "first_comment", mix: { branded: 3, niche: 6, broad: 3 } },
    character_limits: { ideal_min: 200, ideal_max: 1000, absolute_max: 2200 },
  },
  {
    platform: "instagram",
    structure: "meme_relatable",
    label: "Meme / Relatable Content",
    description: "Humor-driven post designed for shares and reach.",
    hook_type: "pattern_interrupt",
    post_structure: ["meme_image_or_video", "relatable_caption", "tag_prompt"],
    cta_pattern: {
      style: "conversational",
      position: "inline",
      examples: ["Tag someone who does this 😂", "It's me. I'm the problem.", "Share to your story if this is you"],
    },
    hashtag_pattern: { count: 8, placement: "first_comment", mix: { branded: 1, niche: 4, broad: 3 } },
    character_limits: { ideal_min: 20, ideal_max: 200, absolute_max: 2200 },
  },
];

// ============================================================
// TIKTOK — Top 5 Structures
// ============================================================

const TIKTOK_TEMPLATES: ContentStructureTemplate[] = [
  {
    platform: "tiktok",
    structure: "hook_tutorial",
    label: "Hook → Tutorial",
    description: "Grab attention then teach something in under 60 seconds.",
    hook_type: "curiosity_gap",
    post_structure: ["pattern_interrupt_hook_0_2s", "promise_statement_2_5s", "step_1_demo", "step_2_demo", "step_3_demo", "result_reveal", "cta_overlay"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Follow for more tips like this", "Save this before it gets buried", "Part 2? Comment YES"],
    },
    hashtag_pattern: { count: 5, placement: "end", mix: { branded: 1, niche: 2, broad: 2 } },
    character_limits: { ideal_min: 30, ideal_max: 150, absolute_max: 2200 },
  },
  {
    platform: "tiktok",
    structure: "storytime",
    label: "Storytime",
    description: "Personal narrative that keeps viewers watching for the resolution.",
    hook_type: "story_opener",
    post_structure: ["shocking_opener", "context_build", "rising_tension", "climax", "lesson_or_punchline"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["Has this happened to you?", "Part 2 if this gets 1000 likes", "Stitch this with your story"],
    },
    hashtag_pattern: { count: 4, placement: "end", mix: { branded: 0, niche: 2, broad: 2 } },
    character_limits: { ideal_min: 30, ideal_max: 100, absolute_max: 2200 },
  },
  {
    platform: "tiktok",
    structure: "trend_remix",
    label: "Trend Remix",
    description: "Ride a trending sound/format but niche it to your audience.",
    hook_type: "pattern_interrupt",
    post_structure: ["trending_sound_or_format", "niche_twist_reveal", "brand_or_personal_context", "punchline"],
    cta_pattern: {
      style: "soft",
      position: "inline",
      examples: ["Duet this with your version", "Follow for more niche takes", "💀💀💀"],
    },
    hashtag_pattern: { count: 5, placement: "end", mix: { branded: 1, niche: 1, broad: 3 } },
    character_limits: { ideal_min: 20, ideal_max: 100, absolute_max: 2200 },
  },
  {
    platform: "tiktok",
    structure: "myth_vs_fact",
    label: "Myth vs. Fact",
    description: "Debunk a common misconception with proof.",
    hook_type: "bold_claim",
    post_structure: ["myth_statement", "dramatic_pause_or_transition", "fact_with_proof", "why_it_matters", "follow_cta"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Follow for more facts your guru won't tell you", "Share this with someone who still believes this", "Comment what myth I should debunk next"],
    },
    hashtag_pattern: { count: 4, placement: "end", mix: { branded: 0, niche: 2, broad: 2 } },
    character_limits: { ideal_min: 30, ideal_max: 120, absolute_max: 2200 },
  },
  {
    platform: "tiktok",
    structure: "pov_skit",
    label: "POV / Skit",
    description: "Character-driven skit that entertains while communicating a message.",
    hook_type: "direct_address",
    post_structure: ["pov_text_overlay", "character_setup", "comedic_or_dramatic_beat", "twist_or_punchline", "brand_tie_in"],
    cta_pattern: {
      style: "soft",
      position: "end",
      examples: ["POV: you finally get it 😂", "Which character are you?", "Follow for more POVs"],
    },
    hashtag_pattern: { count: 4, placement: "end", mix: { branded: 1, niche: 1, broad: 2 } },
    character_limits: { ideal_min: 20, ideal_max: 80, absolute_max: 2200 },
  },
];

// ============================================================
// YOUTUBE — Top 5 Structures
// ============================================================

const YOUTUBE_TEMPLATES: ContentStructureTemplate[] = [
  {
    platform: "youtube",
    structure: "value_packed_tutorial",
    label: "Value-Packed Tutorial",
    description: "Step-by-step walkthrough that solves a specific problem.",
    hook_type: "question",
    post_structure: ["hook_question_0_15s", "credibility_bump", "step_1_with_demo", "step_2_with_demo", "step_3_with_demo", "recap", "cta_subscribe_and_link"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Subscribe and hit the bell 🔔", "Grab the free template in the description", "Drop a comment if this helped"],
    },
    hashtag_pattern: { count: 5, placement: "end", mix: { branded: 1, niche: 2, broad: 2 } },
    character_limits: { ideal_min: 200, ideal_max: 2000, absolute_max: 5000 },
  },
  {
    platform: "youtube",
    structure: "listicle_countdown",
    label: "Listicle / Countdown",
    description: "Ranked list format with reveals — keeps watch time high.",
    hook_type: "curiosity_gap",
    post_structure: ["teaser_hook", "number_5", "number_4", "number_3", "number_2", "dramatic_pause", "number_1_reveal", "honorable_mentions", "cta"],
    cta_pattern: {
      style: "value_exchange",
      position: "end",
      examples: ["Which one was YOUR #1? Comment below", "Watch next: [related video]", "Like if you agree with our #1 pick"],
    },
    hashtag_pattern: { count: 8, placement: "end", mix: { branded: 1, niche: 4, broad: 3 } },
    character_limits: { ideal_min: 300, ideal_max: 2500, absolute_max: 5000 },
  },
  {
    platform: "youtube",
    structure: "case_study_deep_dive",
    label: "Case Study / Deep Dive",
    description: "Analyze a real example with data and takeaways.",
    hook_type: "statistic",
    post_structure: ["shocking_result_hook", "backstory", "strategy_breakdown", "data_analysis", "key_takeaways", "how_to_apply", "cta"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Want us to analyze YOUR strategy? Drop it in the comments", "Subscribe for weekly deep dives", "Full breakdown linked in description"],
    },
    hashtag_pattern: { count: 6, placement: "end", mix: { branded: 1, niche: 3, broad: 2 } },
    character_limits: { ideal_min: 400, ideal_max: 3000, absolute_max: 5000 },
  },
  {
    platform: "youtube",
    structure: "shorts_quick_tip",
    label: "Shorts: Quick Tip",
    description: "YouTube Shorts optimized — one tip in under 60 seconds.",
    hook_type: "bold_claim",
    post_structure: ["bold_hook_0_3s", "context_3_10s", "tip_demo_10_45s", "result_45_55s", "cta_subscribe"],
    cta_pattern: {
      style: "direct",
      position: "end",
      examples: ["Subscribe for daily tips", "Follow for part 2", "Comment what tip you need next"],
    },
    hashtag_pattern: { count: 3, placement: "end", mix: { branded: 0, niche: 2, broad: 1 } },
    character_limits: { ideal_min: 30, ideal_max: 100, absolute_max: 5000 },
  },
  {
    platform: "youtube",
    structure: "reaction_commentary",
    label: "Reaction / Commentary",
    description: "React to industry content with expert commentary.",
    hook_type: "pattern_interrupt",
    post_structure: ["controversial_clip_hook", "initial_reaction", "expert_breakdown", "what_they_got_right", "what_they_got_wrong", "your_verdict", "cta"],
    cta_pattern: {
      style: "conversational",
      position: "end",
      examples: ["Do you agree with my take? Comment below", "What should I react to next?", "Subscribe for honest industry takes"],
    },
    hashtag_pattern: { count: 5, placement: "end", mix: { branded: 1, niche: 2, broad: 2 } },
    character_limits: { ideal_min: 200, ideal_max: 1500, absolute_max: 5000 },
  },
];

// ============================================================
// REGISTRY — Access templates by platform
// ============================================================

const TEMPLATE_REGISTRY: Record<SocialPlatform, ContentStructureTemplate[]> = {
  linkedin: LINKEDIN_TEMPLATES,
  twitter: TWITTER_TEMPLATES,
  instagram: INSTAGRAM_TEMPLATES,
  tiktok: TIKTOK_TEMPLATES,
  youtube: YOUTUBE_TEMPLATES,
};

/** Get all 5 structures for a platform. */
export function getTemplatesForPlatform(platform: SocialPlatform): ContentStructureTemplate[] {
  return TEMPLATE_REGISTRY[platform] || [];
}

/** Get a specific structure by platform + structure key. */
export function getTemplate(platform: SocialPlatform, structure: string): ContentStructureTemplate | undefined {
  return TEMPLATE_REGISTRY[platform]?.find((t) => t.structure === structure);
}

/** Get all platforms and their structure keys. */
export function listAllTemplates(): Array<{ platform: SocialPlatform; structures: string[] }> {
  return Object.entries(TEMPLATE_REGISTRY).map(([platform, templates]) => ({
    platform: platform as SocialPlatform,
    structures: templates.map((t) => t.structure),
  }));
}

// ============================================================
// VARIATION GENERATOR
// Produces 3 tonal variations for a selected structure.
// ============================================================

const VARIATION_TONES = [
  { id: "professional", label: "Professional & Authoritative", instruction: "Use formal language, cite data or credentials, maintain a confident and polished tone." },
  { id: "conversational", label: "Conversational & Relatable", instruction: "Write as if talking to a friend. Use contractions, rhetorical questions, and casual phrasing." },
  { id: "bold", label: "Bold & Provocative", instruction: "Use strong opinions, short punchy sentences, pattern interrupts, and unconventional formatting." },
] as const;

/**
 * Generate 3 variations (professional, conversational, bold) for a given template.
 * Each variation provides section-level writing instructions and example snippets.
 */
export function generateStructureVariations(template: ContentStructureTemplate): StructureVariation[] {
  return VARIATION_TONES.map((tone) => ({
    variationId: `${template.platform}_${template.structure}_${tone.id}`,
    templateStructure: template.structure,
    platform: template.platform,
    tone: tone.label,
    sections: template.post_structure.map((sectionRole) => ({
      role: sectionRole,
      instruction: buildSectionInstruction(sectionRole, tone.id, template),
      example_snippet: buildExampleSnippet(sectionRole, tone.id, template.platform),
    })),
  }));
}

function buildSectionInstruction(
  role: string,
  tone: string,
  template: ContentStructureTemplate
): string {
  const base = SECTION_INSTRUCTIONS[role] || `Write the ${role.replace(/_/g, " ")} section.`;

  const toneOverlay: Record<string, string> = {
    professional: `${base} Use authoritative language and data-driven phrasing.`,
    conversational: `${base} Keep it casual and approachable — write like you're texting a smart friend.`,
    bold: `${base} Make it punchy. Short sentences. No fluff. Break conventions.`,
  };

  const charNote = template.character_limits
    ? ` Stay within ${template.character_limits.ideal_min}-${template.character_limits.ideal_max} chars total.`
    : "";

  return (toneOverlay[tone] || base) + charNote;
}

function buildExampleSnippet(role: string, tone: string, platform: SocialPlatform): string {
  const key = `${platform}_${role}_${tone}`;
  return EXAMPLE_SNIPPETS[key] || EXAMPLE_SNIPPETS[`generic_${role}_${tone}`] || `[${role.replace(/_/g, " ")}]`;
}

// ============================================================
// Section-level writing instructions (role → base instruction)
// ============================================================

const SECTION_INSTRUCTIONS: Record<string, string> = {
  strong_hook: "Open with a line that stops the scroll. Use a bold statement, surprising stat, or direct challenge.",
  vulnerable_hook: "Start with a moment of honesty or vulnerability that humanizes you.",
  hook_with_number: "Lead with a specific number that promises value (e.g., '7 mistakes I made...').",
  provocative_claim: "Make a statement that challenges conventional wisdom in your industry.",
  hook_with_result: "Open with the end result first — then promise to show how.",
  problem_statement: "Clearly define the pain point your audience faces.",
  insight: "Deliver a non-obvious insight that reframes how the reader thinks about the problem.",
  actionable_takeaway: "Give one concrete step the reader can implement today.",
  story_context: "Set the scene — when, where, and what was at stake.",
  turning_point: "Describe the moment everything changed.",
  lesson_extracted: "State the lesson clearly in one or two sentences.",
  universal_takeaway: "Broaden the lesson so it applies to your audience's situation.",
  engagement_question: "End with a question that invites the reader to share their own experience.",
  summary_line: "Wrap up the key message in one memorable sentence.",
  cta: "Include a clear call to action matching the platform's engagement patterns.",
  question: "Ask a thought-provoking question your audience can't resist answering.",
  bold_statement: "Make a definitive claim that takes a clear position.",
  supporting_line: "Add one line of context or evidence that strengthens your statement.",
  mic_drop_or_question: "End with either a punchline or a question that drives replies.",
  direct_hook: "Address the reader directly with 'you' language.",
  single_insight: "Deliver one powerful, immediately useful piece of information.",
  how_to_apply: "Show exactly how to use this insight in 1-2 sentences.",
  hook_tweet: "The first tweet must hook — make them click 'Show this thread'.",
  context_tweet: "Provide just enough context so the thread makes sense.",
  before_state: "Describe the 'before' — the struggle, the old way, the problem.",
  separator: "Use a visual break — an arrow, a line, or 'vs.'.",
  after_state: "Show the transformation — the 'after' that feels aspirational.",
  punchline: "Land the emotional or intellectual payoff.",
  cover_slide_hook: "Design a cover slide headline that makes people swipe.",
  problem_slide: "Visualize the problem on one slide.",
  solution_slide_1: "First solution point — keep text minimal, visuals strong.",
  solution_slide_2: "Second solution point — build on the previous slide.",
  solution_slide_3: "Third solution point — the most impactful insight goes here.",
  summary_slide: "Recap all key points in a scannable format.",
  cta_slide: "Final slide with a clear, single CTA.",
  visual_hook_0_3s: "First 3 seconds must grab attention — movement, text overlay, or surprising visual.",
  problem_statement_3_8s: "State the problem quickly — your audience should nod in recognition.",
  solution_reveal_8_20s: "Reveal your solution with energy and clarity.",
  proof_or_demo_20_45s: "Show it working — screen recordings, before/after, or live demo.",
  cta_overlay_last_5s: "End with on-screen text CTA + verbal reinforcement.",
  opening_line_hook: "First line of caption must stop the scroll — no 'Hey guys' openers.",
  story_setup: "Set the scene in 1-2 sentences.",
  conflict_or_challenge: "Introduce the tension or obstacle.",
  resolution: "Show how it was resolved.",
  lesson_or_reflection: "Share what you learned.",
  question_for_audience: "Invite the audience into the conversation.",
  result_hook: "Lead with the impressive result or metric.",
  context_and_challenge: "What was the starting point? What made it hard?",
  approach_taken: "Briefly describe the strategy or method.",
  result_details: "Break down the results with specifics.",
  testimonial_quote: "Include a direct quote from the customer or client.",
  meme_image_or_video: "The visual IS the content — make it instantly recognizable.",
  relatable_caption: "Short caption that amplifies the meme's message.",
  tag_prompt: "Encourage tagging or sharing.",
  pattern_interrupt_hook_0_2s: "First 2 seconds: unexpected visual or audio that disrupts scrolling.",
  promise_statement_2_5s: "Tell them exactly what they'll learn in this video.",
  step_1_demo: "Show the first step with clear, fast demonstration.",
  step_2_demo: "Second step — maintain pacing, don't lose momentum.",
  step_3_demo: "Final step — build to the payoff.",
  result_reveal: "Show the finished result — make it satisfying.",
  cta_overlay: "On-screen CTA: follow, save, or comment.",
  shocking_opener: "Start with the most shocking or emotional part of the story.",
  context_build: "Fill in the backstory quickly.",
  rising_tension: "Build suspense — what went wrong? What was at stake?",
  climax: "The peak moment of the story.",
  lesson_or_punchline: "Deliver the lesson or comedic payoff.",
  trending_sound_or_format: "Use the trending sound/format exactly as expected.",
  niche_twist_reveal: "Apply your unique niche spin to the trend.",
  brand_or_personal_context: "Connect it back to your brand or expertise.",
  myth_statement: "State the myth clearly — the audience should believe it's true.",
  dramatic_pause_or_transition: "Use a visual or audio transition to signal the debunk.",
  fact_with_proof: "Present the fact with evidence — screenshots, data, demos.",
  why_it_matters: "Explain the real-world impact of this misconception.",
  follow_cta: "Prompt them to follow for more truth bombs.",
  pov_text_overlay: "Set up the POV with on-screen text.",
  character_setup: "Establish the character in 2-3 seconds.",
  comedic_or_dramatic_beat: "The core comedic or dramatic moment.",
  twist_or_punchline: "Unexpected turn that makes the video memorable.",
  brand_tie_in: "Subtly connect the skit back to your product/message.",
  hook_question_0_15s: "Open with the question your target audience is Googling.",
  credibility_bump: "Quickly establish why YOU are the person to teach this.",
  recap: "Summarize all steps in 15-30 seconds.",
  cta_subscribe_and_link: "Subscribe CTA + link to resources in description.",
  teaser_hook: "Tease the #1 pick without revealing it.",
  number_5: "Entry #5 — start with a strong but not top-tier pick.",
  number_4: "Entry #4 — slightly better, build momentum.",
  number_3: "Entry #3 — the middle pick that surprises.",
  number_2: "Entry #2 — a crowd favorite that narrowly misses #1.",
  dramatic_pause: "Build tension before the #1 reveal.",
  number_1_reveal: "The #1 pick — make it feel earned and justified.",
  honorable_mentions: "Quick shoutout to picks that didn't make the list.",
  shocking_result_hook: "Open with the headline result — revenue, growth, or impact number.",
  backstory: "Context: who, what industry, what was the starting point.",
  strategy_breakdown: "Break down the strategy into clear phases.",
  data_analysis: "Show the data — charts, screenshots, or on-screen graphics.",
  key_takeaways: "3-5 bullet point takeaways the viewer can apply.",
  how_to_apply_casestudy: "Bridge from the case study to the viewer's situation.",
  bold_hook_0_3s: "3-second hook — text on screen + verbal punch.",
  context_3_10s: "Quick context so the tip makes sense.",
  tip_demo_10_45s: "Demonstrate the tip with energy and clarity.",
  result_45_55s: "Show the result or impact of applying the tip.",
  cta_subscribe: "Clean subscribe CTA — verbal + on-screen.",
  controversial_clip_hook: "Start with the most polarizing moment from the content.",
  initial_reaction: "Your genuine first reaction — authentic and unfiltered.",
  expert_breakdown: "Break down what's actually happening with your expertise.",
  what_they_got_right: "Acknowledge the valid points.",
  what_they_got_wrong: "Call out the mistakes or misinformation.",
  your_verdict: "Give your final, clear verdict.",
  conventional_wisdom: "State what most people currently believe.",
  evidence_against: "Present evidence that challenges the belief.",
  reframe: "Offer a new way to think about it.",
  new_perspective: "Land your unique point of view.",
  open_question: "Leave the audience thinking with an open-ended question.",
  framework_name: "Give your framework a memorable, branded name.",
  step_1: "First step of the framework — clear and actionable.",
  step_2: "Second step — builds on step 1.",
  step_3: "Third step — the step that delivers the result.",
  proof_point: "Show evidence that this framework works.",
  list_item_1: "First tip/mistake/lesson — lead with the strongest.",
  list_item_2: "Second item — maintain energy.",
  list_item_3: "Third item — the non-obvious one.",
  list_item_4: "Fourth item — practical and tactical.",
  list_item_5: "Fifth item — end the list strong.",
  optional_context: "One line of context if the question needs it — otherwise skip.",
  point_1: "First key point — expand with evidence or example.",
  point_2: "Second key point — different angle from point 1.",
  point_3: "Third key point — the most impactful.",
  summary_tweet: "Tie all points together in one clean tweet.",
  cta_tweet: "Final tweet: clear CTA + reason to follow/repost.",
};

// ============================================================
// Example snippets keyed by `{platform}_{role}_{tone}` or
// `generic_{role}_{tone}` as fallback.
// ============================================================

const EXAMPLE_SNIPPETS: Record<string, string> = {
  // LinkedIn professional
  "linkedin_strong_hook_professional": "Most B2B content strategies fail for one reason — and it's not what you think.",
  "linkedin_strong_hook_conversational": "So I tried something wild with my content last month…",
  "linkedin_strong_hook_bold": "Your content strategy is broken. Here's proof.",
  "linkedin_problem_statement_professional": "According to recent data, 73% of B2B marketers struggle to generate qualified leads through content.",
  "linkedin_problem_statement_conversational": "You're posting every day but your DMs are empty. Sound familiar?",
  "linkedin_problem_statement_bold": "You don't have a content problem. You have a RELEVANCE problem.",
  
  // Twitter
  "twitter_bold_statement_professional": "The most effective marketing teams spend 80% of their time on distribution, not creation.",
  "twitter_bold_statement_conversational": "hot take: nobody cares about your product. they care about what it does for them.",
  "twitter_bold_statement_bold": "Stop making content. Start making movements.",
  "twitter_question_professional": "What's the one marketing metric you'd choose if you could only track one?",
  "twitter_question_conversational": "Real talk: what's the marketing hill you'd die on?",
  "twitter_question_bold": "If your entire marketing budget was $100, where would EVERY dollar go?",

  // Instagram
  "instagram_opening_line_hook_professional": "We analyzed 10,000 Instagram posts to find what actually drives engagement. The results surprised us.",
  "instagram_opening_line_hook_conversational": "I almost didn't post this because it's embarrassing. But here we go…",
  "instagram_opening_line_hook_bold": "DELETE your content calendar. I'm serious.",
  "instagram_cover_slide_hook_professional": "5 Data-Backed Strategies That Doubled Our Engagement in 30 Days",
  "instagram_cover_slide_hook_conversational": "The posting strategy nobody talks about 🤫",
  "instagram_cover_slide_hook_bold": "STOP doing this on Instagram (seriously)",

  // TikTok
  "tiktok_pattern_interrupt_hook_0_2s_professional": "[Points at camera] \"The marketing strategy that generated $2M in pipeline…\"",
  "tiktok_pattern_interrupt_hook_0_2s_conversational": "\"Wait wait wait — you're telling me you're STILL doing this??\"",
  "tiktok_pattern_interrupt_hook_0_2s_bold": "[Slams desk] \"THIS. Changes. Everything.\"",
  "tiktok_shocking_opener_professional": "\"Last quarter, we lost our biggest client. Here's what happened next.\"",
  "tiktok_shocking_opener_conversational": "\"So this morning I got a DM that completely changed my business…\"",
  "tiktok_shocking_opener_bold": "\"I got fired. Best thing that ever happened.\"",

  // YouTube
  "youtube_hook_question_0_15s_professional": "How do the top 1% of marketers consistently generate viral content? In this video, I'll break down the exact framework.",
  "youtube_hook_question_0_15s_conversational": "Ever wonder why some posts blow up and yours don't? Same. So I spent 3 months figuring it out.",
  "youtube_hook_question_0_15s_bold": "Everything you know about YouTube SEO is wrong. Let me prove it in the next 10 minutes.",

  // Generic fallbacks
  "generic_cta_professional": "Follow for more data-driven insights.",
  "generic_cta_conversational": "If this helped, share it with someone who needs it 🙏",
  "generic_cta_bold": "Follow. Now. You'll thank me later.",
  "generic_strong_hook_professional": "Here's what the data actually shows.",
  "generic_strong_hook_conversational": "Let me tell you something nobody's talking about…",
  "generic_strong_hook_bold": "This changes everything. No, really.",
};
