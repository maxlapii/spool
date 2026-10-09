import { useHashRoute } from './hooks/useHashRoute'
import { ProjectsPage } from './components/projects/ProjectsPage'
import { Editor } from './components/Editor'

export default function App() {
  const route = useHashRoute()
  if (route.page === 'editor') return <Editor key={route.projectId} projectId={route.projectId} />
  return <ProjectsPage />
}
