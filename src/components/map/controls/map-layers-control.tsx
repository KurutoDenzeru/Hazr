import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Layers, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppSettings } from "@/types/settings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const LightMapSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#E8EAED" />
    <path d="M 0 60 Q 40 50 60 100 L 0 100 Z" fill="#A7F3D0" />
    <path d="M 60 0 Q 80 40 100 60 L 100 0 Z" fill="#BAE6FD" />
    <path d="M -10 40 L 110 80" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
    <path d="M 40 -10 L 60 110" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const DarkMapSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#0F172A" />
    <path d="M 0 60 Q 40 50 60 100 L 0 100 Z" fill="#064E3B" />
    <path d="M 60 0 Q 80 40 100 60 L 100 0 Z" fill="#1E3A8A" />
    <path d="M -10 40 L 110 80" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
    <path d="M 40 -10 L 60 110" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const VoyagerMapSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#FEF3C7" />
    <path d="M 0 60 Q 40 50 60 100 L 0 100 Z" fill="#6EE7B7" />
    <path d="M 60 0 Q 80 40 100 60 L 100 0 Z" fill="#7DD3FC" />
    <path d="M -10 40 L 110 80" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
    <path d="M 40 -10 L 60 110" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const AutoMapSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="auto-light-clip">
        <polygon points="0,0 100,0 0,100" />
      </clipPath>
      <clipPath id="auto-dark-clip">
        <polygon points="100,0 100,100 0,100" />
      </clipPath>
    </defs>
    <g clipPath="url(#auto-light-clip)">
      <rect width="100" height="100" fill="#E8EAED" />
      <path d="M 0 60 Q 40 50 60 100 L 0 100 Z" fill="#A7F3D0" />
      <path d="M 60 0 Q 80 40 100 60 L 100 0 Z" fill="#BAE6FD" />
      <path d="M -10 40 L 110 80" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" />
      <path d="M 40 -10 L 60 110" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    </g>
    <g clipPath="url(#auto-dark-clip)">
      <rect width="100" height="100" fill="#0F172A" />
      <path d="M 0 60 Q 40 50 60 100 L 0 100 Z" fill="#064E3B" />
      <path d="M 60 0 Q 80 40 100 60 L 100 0 Z" fill="#1E3A8A" />
      <path d="M -10 40 L 110 80" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
      <path d="M 40 -10 L 60 110" stroke="#1E293B" strokeWidth="6" strokeLinecap="round" />
    </g>
  </svg>
);

const GlobeSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#1E293B" />
    <circle cx="50" cy="50" r="35" fill="#0EA5E9" />
    <path d="M 25 35 Q 40 10 55 30 T 40 65 Q 25 70 15 50 Q 15 40 25 35 Z" fill="#10B981" />
    <path d="M 65 25 Q 85 20 80 45 T 70 70 Q 55 55 60 45 Q 65 30 65 25 Z" fill="#10B981" />
    <path d="M 40 75 Q 50 65 65 75 T 50 90 Q 30 80 40 75 Z" fill="#10B981" />
    <path d="M 15 50 Q 50 75 85 50" stroke="#38BDF8" strokeWidth="1" fill="none" />
    <path d="M 50 15 Q 25 50 50 85" stroke="#38BDF8" strokeWidth="1" fill="none" />
    <path d="M 15 50 Q 50 25 85 50" stroke="#38BDF8" strokeWidth="1" fill="none" />
    <path d="M 50 15 Q 75 50 50 85" stroke="#38BDF8" strokeWidth="1" fill="none" />
  </svg>
);

const Buildings3DSvg = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" fill="#1E293B" />
    <g transform="translate(50, 65)">
      <path d="M -20 -30 L -35 -38 L -20 -46 L -5 -38 Z" fill="#CBD5E1" />
      <path d="M -35 -38 L -35 -15 L -20 -7 L -20 -30 Z" fill="#94A3B8" />
      <path d="M -5 -38 L -5 -15 L -20 -7 L -20 -30 Z" fill="#64748B" />
      
      <path d="M 25 -25 L 10 -33 L 25 -41 L 40 -33 Z" fill="#CBD5E1" />
      <path d="M 10 -33 L 10 -5 L 25 3 L 25 -25 Z" fill="#94A3B8" />
      <path d="M 40 -33 L 40 -5 L 25 3 L 25 -25 Z" fill="#64748B" />
      
      <path d="M 0 -15 L -20 -25 L 0 -35 L 20 -25 Z" fill="#F8FAFC" />
      <path d="M -20 -25 L -20 5 L 0 15 L 0 -15 Z" fill="#CBD5E1" />
      <path d="M 20 -25 L 20 5 L 0 15 L 0 -15 Z" fill="#94A3B8" />
    </g>
  </svg>
);

export function MapLayersControl({
  appSettings,
  onAppSettingsChange,
  is3D,
  toggle3D,
  isGlobe,
  toggleGlobe,
}: {
  appSettings: AppSettings;
  onAppSettingsChange: React.Dispatch<React.SetStateAction<AppSettings>>;
  is3D: boolean;
  toggle3D: () => void;
  isGlobe: boolean;
  toggleGlobe: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="group relative size-12 rounded-xl border border-border/50 bg-background/80 backdrop-blur-xl shadow-sm transition-all hover:bg-background/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-hidden"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Map Layers"
              >
                <div className="absolute inset-0 transition-colors flex items-center justify-center">
                  <Layers className="size-5 text-foreground/80 group-hover:text-foreground drop-shadow-sm" />
                </div>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>Map Layers</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <PopoverContent
        side="top"
        align="start"
        sideOffset={16}
        className="w-[320px] p-0 rounded-[20px] border border-border/40 bg-background/85 backdrop-blur-3xl shadow-2xl z-50 pointer-events-auto supports-backdrop-filter:bg-background/60 overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20 relative z-10">
          <h2 className="text-[13px] font-semibold text-foreground tracking-wide">Map details</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            className="rounded-full p-1 hover:bg-foreground/10 transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
            aria-label="Close Map Details"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-3 space-y-4 relative z-10">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Type</h3>
            <div className="grid grid-cols-2 gap-2">
               <MapTypeButton 
                  label="Auto" 
                  icon={<AutoMapSvg />} 
                  selected={appSettings.mapStyle === "auto"}
                  onClick={() => onAppSettingsChange(prev => ({...prev, mapStyle: "auto"}))}
               />
               <MapTypeButton 
                  label="Light" 
                  icon={<LightMapSvg />} 
                  selected={appSettings.mapStyle === "light"}
                  onClick={() => onAppSettingsChange(prev => ({...prev, mapStyle: "light"}))}
               />
               <MapTypeButton 
                  label="Dark" 
                  icon={<DarkMapSvg />} 
                  selected={appSettings.mapStyle === "dark"}
                  onClick={() => onAppSettingsChange(prev => ({...prev, mapStyle: "dark"}))}
               />
               <MapTypeButton 
                  label="Voyager" 
                  icon={<VoyagerMapSvg />} 
                  selected={appSettings.mapStyle === "voyager"}
                  onClick={() => onAppSettingsChange(prev => ({...prev, mapStyle: "voyager"}))}
               />
            </div>
          </div>

          <div className="h-px bg-border/40 w-full" />

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Map Details</h3>
            <div className="grid grid-cols-2 gap-2">
               <MapTypeButton 
                  label="3D Globe" 
                  icon={<GlobeSvg />} 
                  selected={isGlobe}
                  onClick={toggleGlobe}
               />
               <MapTypeButton 
                  label="3D Mode" 
                  icon={<Buildings3DSvg />} 
                  selected={is3D}
                  onClick={toggle3D}
               />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MapTypeButton({ label, selected, onClick, icon }: { label: string; selected: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group w-full focus:outline-none"
    >
      <div className={cn(
        "w-full max-w-[110px] aspect-square rounded-[12px] border-2 flex items-center justify-center overflow-hidden transition-all duration-300 relative bg-background mx-auto", 
        selected ? "border-primary shadow-[0_0_0_2px_rgba(var(--primary),0.2)]" : "border-border/50 group-hover:border-foreground/30 group-hover:shadow-sm"
      )}>
        {icon}
        {selected && (
          <div className="absolute top-1.5 right-1.5 size-2.5 bg-primary rounded-full border-2 border-background shadow-sm z-10" />
        )}
      </div>
      <span className={cn(
        "text-[10px] tracking-wide transition-colors", 
        selected ? "text-primary font-semibold" : "text-muted-foreground font-medium group-hover:text-foreground"
      )}>
        {label}
      </span>
    </button>
  );
}