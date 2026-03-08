import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: { native: string }) => void;
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  return (
    <div
      className={cn(
        "overflow-hidden bg-base-100 border-[1.5px] border-base-300 rounded-xl shadow-xl",
        "[&_em-emoji-picker]:[--color-border:transparent] [&_em-emoji-picker]:[--rgb-background:transparent] [&_em-emoji-picker]:[--rgb-color:oklch(var(--foreground))] [&_em-emoji-picker]:[--rgb-accent:oklch(var(--primary))]"
      )}
    >
      <Picker
        data={data}
        onEmojiSelect={onEmojiSelect}
        navPosition="bottom"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );
}

// TODO: Replace category icons with the following from HugeIcons package:
//   frequent: Clock01Icon
//   people:   HappyIcon
//   nature:   Leaf01Icon
//   food:     Pizza01Icon
//   activity: Basketball01Icon
//   travel:   Airplane01Icon
//   objects:  IdeaIcon
//   symbols:  ?????????
//   flags:    Flag02Icon