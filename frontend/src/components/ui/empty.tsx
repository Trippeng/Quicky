export function EmptyState({ title = 'No items', description }: { title?: string; description?: string }) {
  return (
    <div className="text-center text-sm text-muted-foreground py-8">
      <div className="font-medium mb-1">{title}</div>
      {description && <div>{description}</div>}
    </div>
  )
}
