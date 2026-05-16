import WorkspaceClient from '@/components/workspace/WorkspaceClient'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <WorkspaceClient presentationId={id} />
}
