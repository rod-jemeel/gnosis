"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Neubrutalist button: hard offset shadow, no blur.
 * Hover (fine pointers only — Tailwind v4 scopes `hover:`) lifts the
 * button away from the surface; pressing shoves it flat into its
 * shadow. 150ms with a strong ease-out so feedback feels instant.
 * Ghost/link stay flat and answer with a subtle scale instead.
 */
const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-none border-2 border-transparent bg-clip-padding text-xs font-medium focus-visible:ring-1 aria-invalid:ring-1 [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none",
  {
    variants: {
      variant: {
        default:
          "border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        outline:
          "border-foreground bg-background hover:bg-muted hover:text-foreground dark:bg-card shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        secondary:
          "border-foreground bg-secondary text-secondary-foreground shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        ghost:
          "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground active:scale-[0.97]",
        destructive:
          "border-foreground bg-destructive text-white shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none focus-visible:border-foreground",
        link: "text-primary underline-offset-4 hover:underline active:scale-[0.97]",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-none px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 rounded-none [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-none",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
