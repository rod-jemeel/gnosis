import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "dark:bg-card border-input dark:border-input focus-visible:shadow-[3px_3px_0_0_var(--ring)] focus-visible:-translate-x-px focus-visible:-translate-y-px aria-invalid:shadow-[3px_3px_0_0_var(--destructive)] disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-none border-2 bg-background px-2.5 py-1 text-xs transition-[box-shadow,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] file:h-6 file:text-xs file:font-medium md:text-xs file:text-foreground placeholder:text-muted-foreground w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
