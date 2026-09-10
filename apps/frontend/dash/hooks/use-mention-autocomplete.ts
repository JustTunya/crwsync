import { useMemo } from "react";
import type { WorkspaceMember, WorkspaceUser } from "@crwsync/types";

export interface MentionMatch {
  display: string;
  replaceWith: string;
}

export function useMentionAutocomplete(members: WorkspaceMember[] | undefined) {
  const activeMentions = useMemo<MentionMatch[]>(() => {
    const list: MentionMatch[] = [];
    if (members) {
      members.forEach((m) => {
        if (m.user) {
          list.push({
            display: `@${m.user.firstname} ${m.user.lastname}`,
            replaceWith: `@[${m.user.firstname} ${m.user.lastname}](user:${m.user.id})`,
          });
        }
      });
    }
    return list.sort((a, b) => b.display.length - a.display.length);
  }, [members]);

  const filterMembers = (searchText: string): WorkspaceUser[] => {
    const search = searchText.toLowerCase();
    return (members || [])
      .filter((m) => m.user)
      .filter((m) => {
        const u = m.user!;
        const f = u.firstname?.toLowerCase() || "";
        const l = u.lastname?.toLowerCase() || "";
        const un = u.username?.toLowerCase() || "";
        const fullName = `${f} ${l}`;
        return f.includes(search) || l.includes(search) || un.includes(search) || fullName.includes(search);
      })
      .map((m) => m.user!);
  };

  const detectAtTrigger = (textBeforeCursor: string): { text: string; startIndex: number } | null => {
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");
    if (lastAtSymbolIndex === -1) return null;
    const charBefore = textBeforeCursor[lastAtSymbolIndex - 1];
    if (lastAtSymbolIndex !== 0 && !/[\s\n]/.test(charBefore)) return null;
    const textAfterAt = textBeforeCursor.slice(lastAtSymbolIndex + 1);
    if (textAfterAt.startsWith(" ") || /\n/.test(textAfterAt) || textAfterAt.length >= 50) return null;
    return { text: textAfterAt, startIndex: lastAtSymbolIndex };
  };

  const expandMentions = (content: string): string => {
    if (!activeMentions.length) return content;
    const escaped = activeMentions.map((m) => m.display.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const regex = new RegExp(`(^|\\n|\\s)(${escaped.join("|")})(?=$|\\s|\\n|[.,!?;:])`, "g");
    return content.replace(regex, (match, p1, p2) => {
      const mention = activeMentions.find((m) => m.display === p2);
      return p1 + (mention ? mention.replaceWith : p2);
    });
  };

  const extractMentionedUserIds = (content: string): string[] =>
    [...content.matchAll(/@\[.*?\]\(user:([a-zA-Z0-9-]+)\)/g)].map((m) => m[1]);

  return { activeMentions, filterMembers, detectAtTrigger, expandMentions, extractMentionedUserIds };
}
