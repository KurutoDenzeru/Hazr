import * as React from "react";

import { cn } from "@/lib/utils";

type MobileNavItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

type MobileBottomNavProps = {
  items: MobileNavItem[];
  className?: string;
};

const MobileBottomNav = ({ items, className }: MobileBottomNavProps) => {
  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "md:hidden pointer-events-auto mx-2 mb-2 grid grid-cols-4 gap-1 rounded-2xl border border-border/60 bg-background/80 p-2 shadow-xs shadow-black/5 supports-backdrop-filter:bg-background/60 supports-backdrop-filter:backdrop-blur-xl pb-[calc(env(safe-area-inset-bottom)+0.75rem)]",
        className,
      )}
    >
      {items.map((item) => (
        <MobileBottomNavItem key={item.label} {...item} />
      ))}
    </nav>
  );
};

const MobileBottomNavItem = ({
  icon: Icon,
  label,
  active = false,
  onClick,
}: MobileNavItem) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!onClick) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onClick();
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={cn(
        "group/nav-item relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-1.5 text-muted-foreground transition-all duration-200 ease-out hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 active:scale-[0.98] active:translate-y-[1px]",
        active && "text-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 rounded-2xl bg-muted/0 transition-all duration-200",
          active && "bg-muted/70",
          !active && "group-hover/nav-item:bg-muted/50 group-active/nav-item:bg-muted/60",
        )}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-20 rounded-2xl opacity-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-opacity duration-200 group-hover/nav-item:opacity-100"
      />
      <Icon className="size-6" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
};

export { MobileBottomNav };
export type { MobileBottomNavProps, MobileNavItem };
