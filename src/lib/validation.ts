/**
 * NEXXO Production Validation & Abuse Protection
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// In-Memory Rate Limiter to prevent rapid spam actions
class ActionRateLimiter {
  private timestamps: Map<string, number[]> = new Map();

  /**
   * Checks if an action by an actor exceeds max allowed operations within a given time window.
   * @param key Unique key e.g. "msg_${userId}"
   * @param maxLimit Maximum actions allowed
   * @param windowMs Time window in milliseconds
   */
  public canPerform(key: string, maxLimit: number, windowMs: number): boolean {
    const now = Date.now();
    const list = this.timestamps.get(key) || [];
    const recent = list.filter((t) => now - t < windowMs);

    if (recent.length >= maxLimit) {
      return false;
    }

    recent.push(now);
    this.timestamps.set(key, recent);
    return true;
  }

  public reset(key: string): void {
    this.timestamps.delete(key);
  }
}

export const rateLimiter = new ActionRateLimiter();

/**
 * Validates chat or group message text
 */
export function validateMessageContent(
  text: string,
  hasAttachment = false,
  maxLength = 4000
): ValidationResult {
  const trimmed = text.trim();
  if (!trimmed && !hasAttachment) {
    return { valid: false, error: 'Message cannot be empty.' };
  }

  if (trimmed.length > maxLength) {
    return {
      valid: false,
      error: `Message exceeds maximum permitted length (${maxLength} characters).`,
    };
  }

  return { valid: true };
}

/**
 * Validates group, community, or channel name
 */
export function validateEntityName(name: string, type: 'group' | 'channel' | 'community'): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: `${type.charAt(0).toUpperCase() + type.slice(1)} name must be at least 2 characters.` };
  }
  if (trimmed.length > 64) {
    return { valid: false, error: `${type.charAt(0).toUpperCase() + type.slice(1)} name cannot exceed 64 characters.` };
  }
  return { valid: true };
}

/**
 * Validates handle for channels e.g. @tech_news
 */
export function validateChannelHandle(handle: string): ValidationResult {
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(clean)) {
    return {
      valid: false,
      error: 'Handle must be 3-30 characters long and contain only letters, numbers, and underscores.',
    };
  }
  return { valid: true };
}

/**
 * Validates user bio
 */
export function validateBio(bio: string): ValidationResult {
  if (bio.length > 250) {
    return { valid: false, error: 'Bio cannot exceed 250 characters.' };
  }
  return { valid: true };
}

/**
 * Validates user display name
 */
export function validateDisplayName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: 'Display name cannot be empty.' };
  }
  if (trimmed.length > 50) {
    return { valid: false, error: 'Display name cannot exceed 50 characters.' };
  }
  return { valid: true };
}
