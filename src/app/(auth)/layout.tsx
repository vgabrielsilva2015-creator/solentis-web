export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background text-foreground px-4">
      {children}
    </main>
  )
}
