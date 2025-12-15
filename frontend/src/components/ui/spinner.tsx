export function Spinner({ size = 16 }: { size?: number }) {
  const px = `${size}px`
  return (
    <div
      aria-label="loading"
      className="inline-block border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin"
      style={{ width: px, height: px }}
    />
  )
}
