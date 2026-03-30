/**
 * LEGACY: OpenAI Client Reference
 * ================================
 * This file is archived from the ai-controller repo for reference only.
 * The production system now uses claude_client.ts with the Anthropic Messages API.
 * Do NOT import this file in active code.
 *
 * Preserved for: migration reference, rollback documentation, pattern comparison.
 */

// Original OpenAI client implementation was here.
// See ai-controller repo commit history for full source.
// Replaced by: backend/services/claude_client.ts
//
// Key differences:
// - OpenAI used: openai.chat.completions.create()
// - Claude uses: raw fetch to https://api.anthropic.com/v1/messages
// - OpenAI model: gpt-4o / gpt-4o-mini
// - Claude models: claude-sonnet-4-20250514 (creative/analytical) / claude-haiku-4-5-20251001 (lightweight)
// - OpenAI auth: Authorization: Bearer <key>
// - Claude auth: x-api-key: <key>, anthropic-version: 2023-06-01
// - OpenAI response: choices[0].message.content
// - Claude response: content[0].text
//
// Migration date: 2026-03-30
// Migration architect: Claude (Cowork) + Kitchens
