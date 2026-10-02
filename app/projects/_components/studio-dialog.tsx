"use client";

import { studioFontClass } from "@/app/projects/_lib/fonts";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { LoaderCircle, Trash2, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

export function StudioDialog({
  open,
  title,
  description,
  icon,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={cn(studioFontClass, "studio-portal studio-overlay")} />
        <Dialog.Content
          className={cn(studioFontClass, "studio-portal studio-dialog")}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="flex items-start gap-3">
            {icon ? <div className="studio-dialog-icon">{icon}</div> : null}
            <div className="min-w-0 flex-1 pt-0.5">
              <Dialog.Title className="studio-heading text-[22px] leading-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-[var(--studio-muted)]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="studio-icon-btn -mr-2 -mt-2" aria-label="Close">
              <X />
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function StudioField({
  label,
  htmlFor,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="studio-label">
        {label}
        {optional ? (
          <span className="ml-1.5 font-semibold text-[var(--studio-muted-2)]">Optional</span>
        ) : null}
      </label>
      {children}
    </div>
  );
}

export function FormError({ error }: { error?: string | null }) {
  return error ? <p className="studio-form-error">{error}</p> : null;
}

export function DialogActions({
  onCancel,
  pending,
  submitLabel,
  pendingLabel = "Saving…",
  danger,
}: {
  onCancel: () => void;
  pending?: boolean;
  submitLabel: string;
  pendingLabel?: string;
  danger?: boolean;
}) {
  return (
    <div className="studio-dialog-actions">
      <button type="button" className="studio-btn studio-btn-ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </button>
      <button
        type="submit"
        className={cn("studio-btn", danger ? "studio-btn-danger" : "studio-btn-primary")}
        disabled={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {pending ? pendingLabel : submitLabel}
      </button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onConfirm();
  }

  return (
    <StudioDialog open={open} title={title} description={description} icon={<Trash2 />} onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <FormError error={error} />
        <DialogActions
          onCancel={onClose}
          pending={pending}
          submitLabel={confirmLabel}
          pendingLabel="Deleting…"
          danger
        />
      </form>
    </StudioDialog>
  );
}

export function NameDialog({
  open,
  title,
  description,
  icon,
  label = "Name",
  placeholder,
  initialValue = "",
  confirmLabel = "Save",
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  icon?: ReactNode;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (name) onSubmit(name);
  }

  return (
    <StudioDialog open={open} title={title} description={description} icon={icon} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <StudioField label={label} htmlFor="studio-name-input">
          <input
            id="studio-name-input"
            name="name"
            required
            maxLength={80}
            defaultValue={initialValue}
            placeholder={placeholder}
            className="studio-input"
            autoComplete="off"
            autoFocus
          />
        </StudioField>
        <FormError error={error} />
        <DialogActions onCancel={onClose} pending={pending} submitLabel={confirmLabel} />
      </form>
    </StudioDialog>
  );
}
