import { useEffect, useRef } from "react";

type ContextMenuAction =
  | "copy"
  | "cut"
  | "paste"
  | "select-all"
  | "send"
  | "save"
  | "duplicate"
  | "copy-curl"
  | "new-request";

type AppContextMenuProps = {
  x: number;
  y: number;
  hasEditableTarget: boolean;
  onAction: (action: ContextMenuAction) => void;
  onClose: () => void;
};

type MenuItem = {
  action: ContextMenuAction;
  label: string;
  shortcut?: string;
  disabled?: boolean;
};

export type { ContextMenuAction };

export function AppContextMenu({ x, y, hasEditableTarget, onAction, onClose }: AppContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    menuRef.current?.focus();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const clipboardItems: MenuItem[] = [
    { action: "copy", label: "Copy", shortcut: "⌘C", disabled: !hasEditableTarget },
    { action: "cut", label: "Cut", shortcut: "⌘X", disabled: !hasEditableTarget },
    { action: "paste", label: "Paste", shortcut: "⌘V", disabled: !hasEditableTarget },
    { action: "select-all", label: "Select all", shortcut: "⌘A", disabled: !hasEditableTarget },
  ];
  const requestItems: MenuItem[] = [
    { action: "send", label: "Send request", shortcut: "⌘↵" },
    { action: "save", label: "Save request", shortcut: "⌘S" },
    { action: "duplicate", label: "Duplicate request" },
    { action: "copy-curl", label: "Copy as cURL" },
    { action: "new-request", label: "New request", shortcut: "⌘N" },
  ];

  return (
    <div
      aria-label="Onyx context menu"
      className="fixed z-[70] min-w-[224px] rounded-xl border border-border-strong bg-surface-raised/95 p-1.5 shadow-[0_22px_60px_rgba(0,0,0,0.42)] backdrop-blur-md"
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      ref={menuRef}
      role="menu"
      style={{ left: x, top: y }}
      tabIndex={-1}
    >
      <div className="px-2.5 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-600">Onyx actions</div>
      {clipboardItems.map((item) => (
        <MenuButton item={item} key={item.action} onAction={onAction} />
      ))}
      <div className="my-1.5 border-t border-border" />
      {requestItems.map((item) => (
        <MenuButton item={item} key={item.action} onAction={onAction} />
      ))}
    </div>
  );
}

function MenuButton({ item, onAction }: { item: MenuItem; onAction: (action: ContextMenuAction) => void }) {
  return (
    <button
      className="flex w-full items-center justify-between gap-6 rounded-lg px-2.5 py-2 text-left text-[11px] text-neutral-300 transition-colors hover:bg-surface-hover hover:text-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-700"
      disabled={item.disabled}
      onClick={() => onAction(item.action)}
      role="menuitem"
      type="button"
    >
      <span>{item.label}</span>
      {item.shortcut ? <span className="font-mono text-[9px] text-neutral-600">{item.shortcut}</span> : null}
    </button>
  );
}
