"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeAdminHtml } from "@/lib/admin/sanitizeHtml";

const EMOJI_PALETTE = [
  "✨", "🙌", "💡", "❤️", "🎯", "📣", "🤝", "🌱", "📚", "🎙️",
  "✅", "⭐", "🔥", "👏", "💪", "🌍", "📍", "🔗", "📅", "🎉",
];

/**
 * @param {{ value: string, onChange: (html: string) => void, placeholder?: string, minHeight?: number }}
 */
export default function AdminRichTextEditor({ value, onChange, placeholder = "Write content…", minHeight = 140 }) {
  const editorRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = sanitizeAdminHtml(value || "");
    if (el.innerHTML !== next) el.innerHTML = next || "";
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(sanitizeAdminHtml(el.innerHTML));
  }, [onChange]);

  function exec(cmd, arg) {
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    emitChange();
  }

  function insertEmoji(emoji) {
    document.execCommand("insertText", false, emoji);
    editorRef.current?.focus();
    emitChange();
    setShowEmoji(false);
  }

  function insertLink() {
    const url = window.prompt("Link URL (https://…)", "https://");
    if (!url) return;
    exec("createLink", url.trim());
  }

  return (
    <div className="adminRichText">
      <div className="adminRichText__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" className="btnSoft adminRichText__btn" onClick={() => exec("bold")} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" className="btnSoft adminRichText__btn" onClick={() => exec("italic")} title="Italic">
          <em>I</em>
        </button>
        <button type="button" className="btnSoft adminRichText__btn" onClick={insertLink} title="Link">
          Link
        </button>
        <button type="button" className="btnSoft adminRichText__btn" onClick={() => exec("insertUnorderedList")} title="Bullet list">
          • List
        </button>
        <button
          type="button"
          className="btnSoft adminRichText__btn"
          onClick={() => setShowEmoji((v) => !v)}
          title="Insert emoji"
        >
          😀
        </button>
      </div>
      {showEmoji ? (
        <div className="adminRichText__emojiPanel" role="listbox" aria-label="Emoji">
          {EMOJI_PALETTE.map((e) => (
            <button key={e} type="button" className="adminRichText__emoji" onClick={() => insertEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={editorRef}
        className="adminRichText__editor adminConsoleInput"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight }}
        onInput={emitChange}
        onBlur={emitChange}
        suppressContentEditableWarning
      />
    </div>
  );
}
