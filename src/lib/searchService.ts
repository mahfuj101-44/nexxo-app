import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import { NexxoUser } from '../types';

export interface SearchFilters {
  queryText: string;
  currentUserId: string;
}

/**
 * Searches users STRICTLY by their Permanent NEXXO ID (e.g., NX-XXXX-XXXX).
 * As requested, searching by name, username, bio, or email is completely disabled.
 */
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<NexxoUser[]> {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];

  const rawUpper = trimmed.toUpperCase();
  const cleaned = rawUpper.replace(/\s+/g, '');
  const alphanumericOnly = cleaned.replace(/[^A-Z0-9]/g, '');

  const usersRef = collection(db, 'users');
  const resultsMap = new Map<string, NexxoUser>();

  const addUserIfValid = (user: NexxoUser) => {
    if (
      user &&
      user.id !== currentUserId &&
      user.status !== 'suspended' &&
      user.settings?.discoveryAllowed !== false
    ) {
      resultsMap.set(user.id, user);
    }
  };

  try {
    // 1. Direct exact queries for candidate NEXXO IDs
    const candidateIds = new Set<string>();
    candidateIds.add(cleaned);

    // If query doesn't start with "NX-", format it with "NX-"
    if (!cleaned.startsWith('NX-')) {
      candidateIds.add(`NX-${cleaned}`);
    }

    // Try exact matches
    for (const cand of candidateIds) {
      if (cand.length >= 3) {
        const exactQ = query(
          usersRef,
          where('nexxoId', '==', cand),
          limit(5)
        );
        const exactSnap = await getDocs(exactQ);
        exactSnap.forEach((doc) => {
          addUserIfValid(doc.data() as NexxoUser);
        });
      }
    }

    // 2. Prefix queries on nexxoId (Firestore range queries)
    for (const cand of candidateIds) {
      if (cand.length >= 3) {
        const prefixQ = query(
          usersRef,
          where('nexxoId', '>=', cand),
          where('nexxoId', '<=', cand + '\uf8ff'),
          limit(15)
        );
        const prefixSnap = await getDocs(prefixQ);
        prefixSnap.forEach((doc) => {
          addUserIfValid(doc.data() as NexxoUser);
        });
      }
    }

    // 3. Fallback scan among active users - STRICTLY MATCHING nexxoId ONLY
    // Useful if the user omitted dashes (e.g. NX48921048) or typed a segment
    if (resultsMap.size < 10) {
      const generalActiveQuery = query(usersRef, limit(60));
      const generalSnap = await getDocs(generalActiveQuery);
      generalSnap.forEach((doc) => {
        const user = doc.data() as NexxoUser;
        if (!user || !user.nexxoId) return;

        const userNexxoId = user.nexxoId.toUpperCase();
        const userNexxoIdClean = userNexxoId.replace(/[^A-Z0-9]/g, '');

        // Strictly verify NEXXO ID match only (never match name, username, or email)
        const isNexxoIdMatch =
          userNexxoId === cleaned ||
          userNexxoId.includes(cleaned) ||
          (alphanumericOnly.length >= 3 && userNexxoIdClean.includes(alphanumericOnly));

        if (isNexxoIdMatch) {
          addUserIfValid(user);
        }
      });
    }

    return Array.from(resultsMap.values());
  } catch (error) {
    console.warn('Search users caught error:', error);
    return [];
  }
}

