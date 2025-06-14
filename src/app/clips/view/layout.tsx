// Generate static params for export (empty since we handle this client-side)
export async function generateStaticParams() {
  return []
}

export default function ClipLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 