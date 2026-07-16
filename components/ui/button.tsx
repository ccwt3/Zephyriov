import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-label text-sm font-medium uppercase tracking-[0.12em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-2 border-ink/90 bg-primary text-primary-foreground shadow-press-sm hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        destructive:
          "border-2 border-ink/90 bg-destructive text-destructive-foreground shadow-press-sm hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        outline:
          "border-2 border-ink/90 bg-paper shadow-press-sm hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary:
          "border-2 border-ink/90 bg-secondary text-secondary-foreground shadow-press-sm hover:brightness-110 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        ghost: "hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-sm px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
