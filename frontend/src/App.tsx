import { Button } from '@/components/ui/button'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import AppRouter from '@/app/router'
import { Providers } from '@/app/providers'

function App() {
  return (
    <div className="min-h-full p-6">
      <h1 className="text-2xl font-bold mb-4">quicky UI baseline</h1>
      <div className="flex items-center gap-4">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
      <div className="mt-6">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost">Open Menu</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="mt-2 rounded-md border bg-popover p-2 text-sm shadow">
            <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer">Item One</DropdownMenu.Item>
            <DropdownMenu.Item className="px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground cursor-pointer">Item Two</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
      <div className="mt-8 border-t pt-6">
        <Providers>
          <AppRouter />
        </Providers>
      </div>
    </div>
  )
}

export default App
