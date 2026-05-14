export default function WorkspacePage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Workspace</h1>
        <p className="text-textMid">Workspace ID: {params.id}</p>
      </div>
    </main>
  )
}
