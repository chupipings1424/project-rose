import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="state-box not-found">
      <p className="eyebrow">Error 404</p>
      <h1 className="display">Signal lost</h1>
      <p className="muted">That page does not exist in this sector.</p>
      <Link to="/projects" className="btn primary">
        Back to projects
      </Link>
    </div>
  )
}