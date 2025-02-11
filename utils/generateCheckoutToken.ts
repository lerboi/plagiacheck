import { createHash } from 'crypto';

export function generateCheckoutToken(userId: string, timestamp: number) {
  const secret = process.env.API_SECRET_KEY!; // Add this to your .env
  return createHash('sha256')
    .update(`${userId}${timestamp}${secret}`)
    .digest('hex');
}