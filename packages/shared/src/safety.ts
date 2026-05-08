import { MAX_CHAT_LENGTH, MAX_DISPLAY_NAME_LENGTH } from "./constants";

const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "discord.gg",
  "http://",
  "https://"
];

const QUICK_CHAT = [
  "Hello, Starfall!",
  "Want to mine together?",
  "Nice build!",
  "Meet at the plaza?",
  "I found crystals!",
  "Thanks!"
];

export function sanitizeDisplayName(input: string | undefined): string {
  const cleaned = (input ?? "")
    .replace(/[^\w -]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DISPLAY_NAME_LENGTH);

  if (!cleaned) {
    return `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
  }

  return maskBlockedWords(cleaned);
}

export function sanitizeChatMessage(input: string | undefined): string {
  const normalized = (input ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHAT_LENGTH);

  if (!normalized) {
    return "";
  }

  const masked = maskBlockedWords(normalized);
  return masked;
}

export function isAllowedQuickChat(input: string): boolean {
  return QUICK_CHAT.includes(input);
}

export function getQuickChatOptions(): string[] {
  return [...QUICK_CHAT];
}

export function maskBlockedWords(input: string): string {
  let output = input;
  for (const word of BLOCKED_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(escaped, "gi"), "*".repeat(Math.min(word.length, 8)));
  }
  return output;
}
