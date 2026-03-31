import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-green-600 to-green-500 text-white shadow-lg shadow-green-600/25 hover:from-green-500 hover:to-green-400 hover:shadow-green-500/40",
        destructive:
          "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-600/25 hover:from-red-500 hover:to-red-400",
        outline:
          "border-2 border-gray-600 bg-transparent text-gray-200 hover:bg-gray-800 hover:border-gray-500",
        secondary:
          "bg-gray-800 text-gray-100 hover:bg-gray-700 border border-gray-700",
        ghost:
          "text-gray-300 hover:bg-white/10 hover:text-white",
        link:
          "text-green-400 underline-offset-4 hover:underline hover:text-green-300",
        gold:
          "bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold shadow-lg shadow-yellow-500/25 hover:from-yellow-400 hover:to-amber-400",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-md px-3.5 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
