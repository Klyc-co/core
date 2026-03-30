/**
 * KLYC Security Module
 * Request auth, payload validation, header redaction.
 * Migrated from ai-controller/backend/services/security.ts
 */

import { z, type ZodSchema } from 'zod'
import type { WorkflowCallMetadata } from '../models/types'

const AUTH_HEADER = 'x-loveable-auth'
const CLIENT_HEADER = 'x-client-id'
const CLIENT_FALLBACK_HEADER = 'x-loveable-client'
const SOURCE_HEADER = 'x-loveable-source'

export class Security {
  static requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
  }

  static createRequestId(): string {
    if (
      typeof crypto !== 'undefined' &&
      typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function'
    ) {
      return `req-${(crypto as { randomUUID: () => string }).randomUUID()}`
    }
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  static buildMetadata(
    headers?: Record<string, string | undefined>,
    requestId?: string
  ): WorkflowCallMetadata {
    return {
      requestId: requestId ?? this.createRequestId(),
      receivedAt: Date.now(),
      source: headers?.[SOURCE_HEADER],
      clientId: headers?.[CLIENT_HEADER] ?? headers?.[CLIENT_FALLBACK_HEADER],
    }
  }

  static authenticate(headers?: Record<string, string | undefined>): void {
    const expected =
      process.env.LOVEABLE_SHARED_SECRET ?? process.env.LOVEABLE_AUTH_TOKEN

    if (!expected) return

    const provided =
      headers?.[AUTH_HEADER] ?? this.parseBearer(headers?.authorization)

    if (!provided || provided !== expected) {
      throw new Error('Unauthorized request from Loveable client')
    }
  }

  static validatePayload<T>(schema: ZodSchema<T>, payload: unknown): T {
    const result = schema.safeParse(payload)
    if (!result.success) {
      const message = result.error.issues
        .map(issue => `${issue.path.join('.') || 'payload'}: ${issue.message}`)
        .join('; ')
      throw new Error(`Invalid request payload: ${message}`)
    }
    return result.data
  }

  static normalizeKeywords(keywords?: string[]): string[] {
    if (!keywords) return []
    return Array.from(
      new Set(
        keywords
          .map(keyword => keyword?.trim())
          .filter(Boolean)
          .map(keyword => keyword as string)
      )
    ).slice(0, 25)
  }

  static redactHeaders(
    headers?: Record<string, string | undefined>
  ): Record<string, string> {
    if (!headers) return {}
    const redacted: Record<string, string> = {}
    const allowList = [CLIENT_HEADER, CLIENT_FALLBACK_HEADER, SOURCE_HEADER]
    allowList.forEach(key => {
      const value = headers[key]
      if (value) redacted[key] = value
    })
    return redacted
  }

  private static parseBearer(header?: string) {
    if (!header) return undefined
    const token = header.replace(/Bearer\s+/i, '').trim()
    return token || undefined
  }
}
