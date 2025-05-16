export default function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-primary text-white p-4 text-xl">Header</header>

      <main className="flex-1 p-4">
        {children}
      </main>

      <footer className="bg-gray-100 text-center text-sm p-4">
        Footer
      </footer>
    </div>
  )
}
