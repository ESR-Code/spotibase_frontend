"use client";

import { HotspotImageField } from "@/app/editor/_components/drawers/hotspot-image-field";
import { FieldLabel } from "@/app/editor/_components/ui/field-label";
import { SwitchField } from "@/app/editor/_components/ui/switch-field";
import { TypePill } from "@/app/editor/_components/ui/type-pill";
import {
  DRAWER_LOGO_SIZES,
  type DrawerLogoSize,
} from "@/lib/editor/types/editor-settings";

type DrawerLogoFieldsProps = {
  /** e.g. "Legend" — used in the toast. */
  drawerLabel: string;
  logoUrl: string;
  onLogoUrlChange: (value: string) => void;
  logoSize: DrawerLogoSize;
  onLogoSizeChange: (value: DrawerLogoSize) => void;
  hideTitle: boolean;
  onHideTitleChange: (value: boolean) => void;
};

/** Header logo override, size and logo-only switch for a Preview drawer. */
export function DrawerLogoFields({
  drawerLabel,
  logoUrl,
  onLogoUrlChange,
  logoSize,
  onLogoSizeChange,
  hideTitle,
  onHideTitleChange,
}: DrawerLogoFieldsProps) {
  return (
    <>
      <HotspotImageField
        layout="split"
        value={logoUrl}
        onChange={onLogoUrlChange}
        uploadLabel="Upload logo"
        emptyLabel="Project logo"
        hint="Shown in the header. Empty uses the project logo."
        clearTitle="Use project logo"
        successMessage={`${drawerLabel} logo applied`}
      />
      <div>
        <FieldLabel>Logo size</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {DRAWER_LOGO_SIZES.map((size) => (
            <TypePill
              key={size.id}
              active={logoSize === size.id}
              onClick={() => onLogoSizeChange(size.id)}
            >
              {size.label}
            </TypePill>
          ))}
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--editor-muted)" }}>
          Full width shows the image as a banner across the top of the drawer.
        </p>
      </div>
      <SwitchField
        label="Hide title"
        description="Show only the logo: hides the title and the count line"
        checked={hideTitle}
        onChange={onHideTitleChange}
      />
    </>
  );
}
