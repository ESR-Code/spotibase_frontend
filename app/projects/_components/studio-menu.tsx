"use client";

import { studioFontClass } from "@/app/projects/_lib/fonts";
import { cn } from "@/lib/utils";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import type { ComponentProps } from "react";

/** Non-modal by default so menu items can open a Dialog without pointer-events lock races. */
export function StudioMenu({ modal = false, ...props }: ComponentProps<typeof Menu.Root>) {
  return <Menu.Root modal={modal} {...props} />;
}

export const StudioMenuTrigger = Menu.Trigger;
export const StudioMenuRadioGroup = Menu.RadioGroup;

export function StudioMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={12}
        className={cn(studioFontClass, "studio-portal studio-menu", className)}
        {...props}
      />
    </Menu.Portal>
  );
}

export function StudioMenuItem({
  className,
  danger,
  ...props
}: ComponentProps<typeof Menu.Item> & { danger?: boolean }) {
  return (
    <Menu.Item
      className={cn(
        "studio-menu-item",
        danger && "studio-menu-item-danger",
        className,
      )}
      {...props}
    />
  );
}

export function StudioMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof Menu.RadioItem>) {
  return (
    <Menu.RadioItem className={cn("studio-menu-item", className)} {...props}>
      {children}
      <Menu.ItemIndicator className="studio-menu-check">
        <Check />
      </Menu.ItemIndicator>
    </Menu.RadioItem>
  );
}

export function StudioMenuLabel({
  className,
  ...props
}: ComponentProps<typeof Menu.Label>) {
  return <Menu.Label className={cn("studio-menu-label", className)} {...props} />;
}

export function StudioMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator className={cn("studio-menu-separator", className)} {...props} />
  );
}
