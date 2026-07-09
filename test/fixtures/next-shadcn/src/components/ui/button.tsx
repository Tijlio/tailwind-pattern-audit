import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center rounded-md px-4 py-2 text-sm font-medium",
  {
    variants: {
      intent: {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-white text-slate-950 hover:bg-slate-50",
      },
    },
    compoundVariants: [
      {
        intent: "primary",
        class: "shadow-sm ring-1 ring-blue-500",
      },
    ],
  },
);

export function Button({ className }: { className?: string }) {
  return (
    <button
      className={cn("inline-flex items-center rounded-md px-4 py-2 text-sm font-medium", className)}
    />
  );
}
