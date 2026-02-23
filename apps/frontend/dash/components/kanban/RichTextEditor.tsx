"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { HugeiconsIcon } from "@hugeicons/react";
import { TextBoldIcon, TextItalicIcon, TextUnderlineIcon, LeftToRightListNumberIcon, Image01Icon, LeftToRightListBulletIcon, Link02Icon } from "@hugeicons/core-free-icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ReadOnlyDescription({ content }: { content: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
      Underline,
      Link.configure({ openOnClick: true }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "text-xs text-muted-foreground leading-tight line-clamp-2 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const [, setTick] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write a description..." }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    onTransaction: () => setTick((t) => t + 1),
    editorProps: {
      attributes: {
        class: "px-3 py-2 text-sm text-foreground outline-none [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
      },
    },
  });

  if (!editor) return null;

  const activeFormats = [
    editor.isActive("bold") && "bold",
    editor.isActive("italic") && "italic",
    editor.isActive("underline") && "underline",
  ].filter(Boolean) as string[];

  const handleLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex-1 flex flex-col rounded-lg border-[1.5px] border-base-300 bg-base-200 overflow-hidden focus-within:border-primary transition-colors">
      <div role="presentation" className="flex items-center gap-0.5 px-2 py-1.5 border-b border-base-300 bg-base-200/50" onMouseDown={(e) => e.preventDefault()}>
        <ToggleGroup type="multiple" size="sm" value={activeFormats} onValueChange={() => {}}>
          <ToggleGroupItem value="bold" aria-label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextBoldIcon} className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextItalicIcon} className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={TextUnderlineIcon} className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-4 bg-base-300 mx-1" />

        <ToggleGroup type="multiple" size="sm">
          <ToggleGroupItem value="link" aria-label="Insert link" onClick={handleLink} className="size-7 p-0 rounded-md data-[state=on]:bg-none">
            <HugeiconsIcon icon={Link02Icon} className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="ul" aria-label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={LeftToRightListBulletIcon} className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="ol" aria-label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className="size-7 p-0 rounded-md">
            <HugeiconsIcon icon={LeftToRightListNumberIcon} className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-4 bg-base-300 mx-px" />

        <button type="button" title="Image upload (coming soon)" className="size-7 p-0 rounded-md inline-flex items-center justify-center text-muted-foreground opacity-40 cursor-not-allowed" disabled>
          <HugeiconsIcon icon={Image01Icon} className="size-4" />
        </button>
      </div>

      <EditorContent editor={editor} className="flex-1 overflow-y-auto [&_.tiptap]:h-full" />
    </div>
  );
}
