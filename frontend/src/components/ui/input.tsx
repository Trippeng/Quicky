import * as React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = '', ...props }, ref
) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input
        ref={ref}
        className={
          'w-full border rounded px-2 py-2 outline-none focus:ring-2 focus:ring-primary ' +
          (error ? 'border-red-500' : 'border-border') +
          ' ' + className
        }
        {...props}
      />
      {hint && !error && <div className="text-xs text-muted-foreground">{hint}</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
})
