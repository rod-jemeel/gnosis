import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "h-5 gap-1 rounded-none border-2 border-transparent px-2 py-0.5 text-xs font-medium transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! inline-flex items-center justify-center w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-colors overflow-hidden group/badge",
  {
    variants: {
      variant: {
        default: "border-foreground bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)] [a]:hover:bg-primary/80",
        secondary: "border-foreground bg-secondary text-secondary-foreground shadow-[2px_2px_0_0_var(--foreground)] [a]:hover:bg-secondary/80",
        destructive: "border-foreground bg-destructive text-white shadow-[2px_2px_0_0_var(--foreground)] [a]:hover:bg-destructive/80 focus-visible:ring-destructive/20 text-white",
        outline: "border-foreground bg-background text-foreground shadow-[2px_2px_0_0_var(--foreground)] [a]:hover:bg-muted [a]:hover:text-muted-foreground dark:bg-card",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ className, variant })),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
