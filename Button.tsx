import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
}

export function Button({ variant = "default", className, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "cursor-pointer rounded-md border px-3.5 py-2 text-sm transition-[filter,background-color]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variant === "primary"
          ? "border-accent bg-accent font-semibold text-[#11161b] enabled:hover:brightness-110"
          : "border-line bg-[#252b31] text-ink enabled:hover:bg-[#2c343b]",
        className,
      )}
    />
  );
}
