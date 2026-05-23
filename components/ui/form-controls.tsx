"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "ui-focus inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost: "border-default-200 bg-transparent hover:bg-default-100",
        soft: "border-default-200 bg-default-100 text-default-700 hover:bg-default-200",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-base",
      },
      isIconOnly: {
        true: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isDisabled?: boolean;
  isPending?: boolean;
  onPress?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    asChild,
    children,
    className,
    disabled,
    isDisabled,
    isPending,
    isIconOnly,
    onClick,
    onPress,
    type = "button",
    variant,
    size,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      disabled={disabled || isDisabled || isPending}
      onClick={onPress ?? onClick}
      className={cn(buttonVariants({ variant, size, isIconOnly }), className)}
      {...props}
    >
      {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Comp>
  );
});

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn("field-control", className)} {...props} />;
  },
);

const chipVariants = cva("inline-flex items-center rounded-full border font-medium", {
  variants: {
    variant: {
      primary: "border-primary/30 bg-primary/10 text-primary",
      secondary: "border-secondary/30 bg-secondary/10 text-secondary",
      soft: "border-default-200 bg-default-100 text-default-600",
      surface: "border-default-200 bg-content1 text-default-700",
    },
    size: {
      sm: "px-2 py-0.5 text-[11px]",
      md: "px-2.5 py-1 text-xs",
    },
  },
  defaultVariants: { variant: "soft", size: "md" },
});

type ChipProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chipVariants>;

export const Chip = Object.assign(
  function Chip({ className, variant, size, ...props }: ChipProps) {
    return <span className={cn(chipVariants({ variant, size }), className)} {...props} />;
  },
  {
    Label({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
      return <span className={cn("truncate", className)} {...props} />;
    },
  },
);

export function ProgressBar({
  value,
  maxValue = 100,
  className,
}: {
  value: number;
  maxValue?: number;
  size?: "sm" | "md";
  "aria-label"?: string;
  className?: string;
}) {
  const width = `${Math.min(100, Math.max(0, (value / maxValue) * 100))}%`;
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-default-100", className)}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width }} />
    </div>
  );
}
