import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  asChild,
  className,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        variant === "primary" &&
          "bg-electric text-white shadow-[0_8px_20px_rgb(50_103_245/0.28)] hover:bg-corporate",
        variant === "secondary" &&
          "glass-panel text-ink hover:bg-white/90",
        variant === "ghost" && "text-muted hover:bg-mist hover:text-ink",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
