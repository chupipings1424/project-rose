import { Link } from 'react-router-dom'
import { useCurrency } from '../currency/useCurrency'
import { useAsync } from '../hooks/useAsync'
import { useNow } from '../hooks/useNow'
import { PROJECTS, type ProjectInfo, type ProjectStat } from '../projects/registry'

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function ProjectStats({ project }: { project: ProjectInfo }) {
  const stats = useAsync(() => project.loadStats?.() ?? Promise.resolve([]), [project])
  const { compactMoney } = useCurrency()
  // Money is formatted at render time, so switching currency updates the card without reloading.
  const display = (stat: ProjectStat) => ('amount' in stat ? compactMoney(stat.amount) : stat.value)

  if (!project.loadStats) return null
  if (stats.loading) return <p className="muted small">Linking…</p>
  if (stats.error) return <p className="status-line offline">● Offline — start it with npm start</p>

  return (
    <>
      <p className="status-line online">● Online</p>
      <div className="project-stats">
        {stats.data?.map((stat) => (
          <div key={stat.label}>
            <strong>{display(stat)}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function ProjectCard({ project, index }: { project: ProjectInfo; index: number }) {
  const body = (
    <>
      <div className="project-top">
        <span className="project-icon" aria-hidden="true">
          {project.icon}
        </span>
        <span className="project-index">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <p className="eyebrow">{project.tagline}</p>
      <h2>{project.name}</h2>
      <p className="muted">{project.description}</p>
      <ProjectStats project={project} />
      <span className="project-go">{project.path ? 'Launch →' : 'Coming soon'}</span>
    </>
  )

  // Conditional rendering: a real link when the project exists, a plain card otherwise.
  return project.path ? (
    <Link to={project.path} className="card project-card" style={{ animationDelay: `${index * 80}ms` }}>
      {body}
    </Link>
  ) : (
    <div className="card project-card is-disabled" style={{ animationDelay: `${index * 80}ms` }}>
      {body}
    </div>
  )
}

export default function ProjectsHubPage() {
  const now = useNow()

  return (
    <div className="hub">
      <header className="hub-head">
        <div>
          <p className="eyebrow">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="display">{greeting(now.getHours())}</h1>
          <p className="muted">Select a project to launch.</p>
        </div>
        <div className="hub-clock" aria-label="Current time">
          {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </header>

      <div className="project-grid">
        {PROJECTS.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </div>
  )
}