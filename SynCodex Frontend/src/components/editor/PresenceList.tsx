import React, { useEffect, useMemo, useRef, useState } from "react";

type Awareness = {
  clientID: number;
  getStates: () => Map<number, any>;
  on: (event: "change", cb: () => void) => void;
  off: (event: "change", cb: () => void) => void;
};

type PresenceUser = {
  id: string;
  name: string;
  color?: string;
  cursor?: { line: number; column: number } | null;
};

type PresenceTheme = {
  containerClassName?: string;
  statusDotClassName?: string;
  avatarsWrapClassName?: string;
  avatarClassName?: string;
  meAvatarClassName?: string;
  tooltipClassName?: string;
};

type Props = {
  awareness: Awareness | null | undefined;
  localUserId: string;
  status?: "connected" | "connecting" | "disconnected";
  maxVisible?: number;
  throttleMs?: number;
  theme?: PresenceTheme;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function PresenceList({
  awareness,
  localUserId,
  status = "connected",
  maxVisible = 5,
  throttleMs = 120,
  theme,
}: Props) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const throttleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!awareness) {
      setUsers([]);
      return;
    }

    const update = () => {
      const next: PresenceUser[] = [];
      for (const state of awareness.getStates().values()) {
        const u = state?.user;
        if (!u?.id || !u?.name) continue;
        next.push({
          id: String(u.id),
          name: String(u.name),
          color: u.color ? String(u.color) : undefined,
          cursor: u.cursor ?? null,
        });
      }

      // stable ordering: me first, then alphabetical
      next.sort((a, b) => {
        if (a.id === localUserId && b.id !== localUserId) return -1;
        if (b.id === localUserId && a.id !== localUserId) return 1;
        return a.name.localeCompare(b.name);
      });

      if (throttleRef.current) window.clearTimeout(throttleRef.current);
      throttleRef.current = window.setTimeout(() => setUsers(next), throttleMs);
    };

    awareness.on("change", update);
    update();

    return () => {
      awareness.off("change", update);
      if (throttleRef.current) window.clearTimeout(throttleRef.current);
      throttleRef.current = null;
    };
  }, [awareness, localUserId, throttleMs]);

  const me = useMemo(() => users.find((u) => u.id === localUserId) ?? null, [users, localUserId]);
  const others = useMemo(() => users.filter((u) => u.id !== localUserId), [users, localUserId]);

  const containerClassName =
    theme?.containerClassName ??
    "fixed top-14 right-4 z-50 flex items-center gap-3 select-none rounded-full border border-white/10 bg-[#0f141d]/85 px-3 py-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur";

  const statusDotClassName =
    theme?.statusDotClassName ??
    (status === "connected"
      ? "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
      : status === "connecting"
      ? "h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse"
      : "h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]");

  const avatarsWrapClassName =
    theme?.avatarsWrapClassName ?? "flex items-center -space-x-2";

  const avatarClassName =
    theme?.avatarClassName ??
    "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shadow-md ring-1 ring-white/10 transition-transform hover:scale-[1.03]";

  const meAvatarClassName =
    theme?.meAvatarClassName ??
    "ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-[#0f141d]";

  const tooltipClassName =
    theme?.tooltipClassName ??
    "absolute -top-2 right-0 -translate-y-full whitespace-nowrap rounded-md bg-[#0b111a] text-gray-200 border border-white/10 px-3 py-2 text-xs shadow-xl";

  const renderAvatar = (u: PresenceUser, isMe: boolean) => {
    const bg = u.color ?? "#6b7280";
    return (
      <div
        className={`${avatarClassName} ${isMe ? meAvatarClassName : ""}`}
        style={{ backgroundColor: bg }}
        title={isMe ? `${u.name} (You)` : u.name}
      >
        {initials(u.name)}
      </div>
    );
  };

  return (
    <div className={containerClassName}>
      <div className="flex items-center gap-2 pr-1">
        <div className={statusDotClassName} title={status} />
        <span className="text-[11px] font-medium text-gray-300/90">
          Collaborators
        </span>
        <span className="text-[11px] font-semibold text-emerald-300/90">
          {users.length}
        </span>
      </div>
      <div className="h-4 w-px bg-white/10" />

      <div className={avatarsWrapClassName}>
        {me && (
          <div
            className="relative hover:z-10"
            onMouseEnter={() => setHoverId(me.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            {renderAvatar(me, true)}
            {hoverId === me.id && (
              <div className={tooltipClassName}>
                <div className="font-semibold">{me.name}</div>
                <div className="opacity-70">(You)</div>
              </div>
            )}
          </div>
        )}

        {others.slice(0, maxVisible).map((u) => (
          <div
            key={u.id}
            className="relative hover:z-10"
            onMouseEnter={() => setHoverId(u.id)}
            onMouseLeave={() => setHoverId(null)}
          >
            {renderAvatar(u, false)}
            {hoverId === u.id && (
              <div className={tooltipClassName}>
                <div className="font-semibold">{u.name}</div>
                {u.cursor && (
                  <div className="opacity-70">
                    Ln {u.cursor.line}, Col {u.cursor.column}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {others.length > maxVisible && (
          <div
            className="relative hover:z-10"
            onMouseEnter={() => setHoverId("__more__")}
            onMouseLeave={() => setHoverId(null)}
          >
            <div
              className={`${avatarClassName} bg-gray-700`}
              title={`+${others.length - maxVisible} more`}
            >
              +{others.length - maxVisible}
            </div>
            {hoverId === "__more__" && (
              <div className={tooltipClassName}>
                <div className="font-semibold mb-1">More</div>
                {others.slice(maxVisible).map((u) => (
                  <div key={u.id} className="opacity-90">
                    {u.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
