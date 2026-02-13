"use client";

import { Github, Map, Instagram, Linkedin } from "lucide-react";

import {
  DialogClose,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type HazrAboutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PROJECT_DESCRIPTION =
  "Hazr is a real-time geospatial hazard dashboard built with Vite, React, TypeScript, and MapLibre. It combines weather, earthquakes, air quality, and global alert signals into one live map.";

const TECH_STACK = [
  "Vite",
  "React",
  "TypeScript",
  "MapLibre",
  "Tailwind",
  "shadcn/ui",
] as const;

const DATA_APIS = [
  "Open-Meteo - Weather",
  "USGS Earthquakes",
  "NASA EONET - Events",
  "OpenAQ - Air Quality",
  "NWS Alerts - Tsunami",
] as const;

const SOCIAL_LINKS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/kurutodenzeru/",
    icon: Linkedin,
  },
  {
    label: "GitHub",
    href: "https://github.com/KurutoDenzeru/Hazr",
    icon: Github,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/krtclcdy/",
    icon: Instagram,
  },
] as const;

function HazrAboutContent() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{PROJECT_DESCRIPTION}</p>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Tech Stack
        </p>
        <div className="flex flex-wrap gap-2">
          {TECH_STACK.map((item) => (
            <span
              key={item}
              className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs font-medium text-foreground/90"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border/60 bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Data APIs
        </p>
        <div className="flex flex-wrap gap-2">
          {DATA_APIS.map((item) => (
            <span
              key={item}
              className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-xs font-medium text-foreground/90"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Connect
        </p>
        <div className="flex items-center gap-2">
          {SOCIAL_LINKS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              title={label}
              className="inline-flex size-10 items-center justify-center rounded-md border border-border/60 bg-background/80 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function HazrAboutDialog({ open, onOpenChange }: HazrAboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-5 p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-md bg-blue-500/15 text-white">
              <Map className="size-5" />
            </span>
            About Hazr
          </DialogTitle>
        </DialogHeader>

        <HazrAboutContent />

        <DialogFooter className="w-full">
          <DialogClose asChild>
            <Button type="button" className="w-full">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { HazrAboutDialog, HazrAboutContent };
