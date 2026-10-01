import QRCode from 'qrcode';
import { NexxoUser } from '../types';

export async function generateUserQrDataUrl(user: NexxoUser): Promise<string> {
  const payload = JSON.stringify({
    nexxoId: user.nexxoId,
    username: user.username,
    name: user.displayName,
    t: 'nexxo_connect',
  });

  return await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 320,
    color: {
      dark: '#1E1B4B', // Indigo 950
      light: '#FFFFFF',
    },
  });
}

export function parseQrPayload(text: string): { nexxoId?: string; username?: string } | null {
  try {
    const data = JSON.parse(text);
    if (data && (data.nexxoId || data.username)) {
      return {
        nexxoId: data.nexxoId,
        username: data.username,
      };
    }
  } catch {
    // If plain string like NX-XXXX-XXXX or username
    if (text.startsWith('NX-')) {
      return { nexxoId: text.trim() };
    }
    if (text.startsWith('@')) {
      return { username: text.replace(/^@/, '').trim() };
    }
  }
  return null;
}
