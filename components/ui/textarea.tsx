import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input dark:bg-card dark:border-input focus-visible:shadow-[3px_3px_0_0_var(--ring)] focus-visible:-translate-x-px focus-visible:-translate-y-px aria-invalid:shadow-[3px_3px_0_0_var(--destructive)] disabled:bg-input/50 dark:disabled:bg-input/80 rounded-none border-2 bg-background px-2.5 py-2 text-xs transition-[box-shadow,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] md:text-xs placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
