import AppRouter from '@/app/router'
import { Providers } from '@/app/providers'

function App() {
  return (
    <div className="min-h-full">
      <Providers>
        <AppRouter />
      </Providers>
    </div>
  )
}

export default App
