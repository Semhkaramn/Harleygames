import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-green-600 text-white shadow-sm shadow-green-600/25",
        secondary:
          "border-transparent bg-gray-700 text-gray-200",
        destructive:
          "border-transparent bg-red-600 text-white shadow-sm shadow-red-600/25",
        outline:
          "border-gray-600 text-gray-300 bg-transparent",
        success:
          "border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-600/25",
        warning:
          "border-transparent bg-yellow-500 text-black shadow-sm shadow-yellow-500/25",
        info:
          "border-transparent bg-blue-600 text-white shadow-sm shadow-blue-600/25",
        gold:
          "border-transparent bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
