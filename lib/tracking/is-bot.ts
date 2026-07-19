const BOT_UA = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|pingdom|uptimerobot/i;

export function isBotUserAgent(userAgent: string): boolean {
  return BOT_UA.test(userAgent);
}
