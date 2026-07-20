/** Masks an email or phone number for display on the 2FA challenge screen. */
export function maskDestination(destination: string, method: 'SMS' | 'EMAIL'): string {
  if (method === 'EMAIL') {
    const [local, domain] = destination.split('@');
    if (!domain) return '***';
    const visible = local.slice(0, 1);
    return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
  }
  return destination.length > 4 ? `${'*'.repeat(destination.length - 4)}${destination.slice(-4)}` : '****';
}
