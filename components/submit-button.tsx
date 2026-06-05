"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      }
    >
      {pending ? "Saving…" : children}
    </button>
  );
}
