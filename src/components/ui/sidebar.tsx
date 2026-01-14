"use client"

/* eslint-disable react-refresh/only-export-components */

import * as React from "react"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

type SidebarContextValue = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider")
  return context
}

function SidebarProvider({
  children,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)

  const isOpen = openProp ?? uncontrolledOpen
  const setIsOpen = (open: boolean) => {
    onOpenChange?.(open)
    if (openProp === undefined) setUncontrolledOpen(open)
  }

  const toggleSidebar = () => setIsOpen(!isOpen)

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  )
}

const Sidebar = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<"aside"> & {
    widthClassName?: string
    collapsedWidthClassName?: string
    resizable?: boolean
  }
>(
  (
    {
      className,
      widthClassName = "w-72",
      collapsedWidthClassName = "w-16",
      children,
      resizable = false,
      ...props
    },
    ref
  ) => {
    const { isOpen } = useSidebar()

    const currentWidthClassName = isOpen ? widthClassName : collapsedWidthClassName
    const resizeClasses = resizable && isOpen ? "resize-x min-w-[16rem] max-w-[28rem]" : ""

    return (
      <aside
        ref={ref}
        data-state={isOpen ? "expanded" : "collapsed"}
        className={cn(
          "group/sidebar hidden md:block shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
          currentWidthClassName,
          resizeClasses,
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "flex h-full flex-col border-r bg-sidebar text-sidebar-foreground supports-backdrop-filter:bg-sidebar/85 supports-backdrop-filter:backdrop-blur-xl",
            currentWidthClassName,
            resizeClasses,
            "transition-[opacity,transform] duration-300 ease-in-out will-change-transform",
            isOpen
              ? "opacity-100 translate-x-0"
              : "opacity-100 translate-x-0"
          )}
        >
          {children}
        </div>
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-2 border-b px-3 py-3 md:px-4",
      "group-data-[state=collapsed]/sidebar:px-2 group-data-[state=collapsed]/sidebar:justify-center",
      className
    )}
    {...props}
  />
))
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex-1 overflow-auto",
      "group-data-[state=collapsed]/sidebar:overflow-visible",
      className
    )}
    {...props}
  />
))
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-auto border-t px-4 py-3",
      "group-data-[state=collapsed]/sidebar:px-2",
      className
    )}
    {...props}
  />
))
SidebarFooter.displayName = "SidebarFooter"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { asChild?: boolean }
>(({ className, onClick, asChild, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()
  const Comp = asChild ? Slot.Root : "button"

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>)
    toggleSidebar()
  }

  return (
    <Comp
      ref={ref}
      type="button"
      className={cn(className)}
      onClick={handleClick}
      {...props}
    />
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

function SidebarInset({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex min-w-0 flex-1", className)} {...props} />
}

export {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
}
