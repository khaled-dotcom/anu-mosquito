import './PageLoader.css'

function PageLoader({ label = 'Loading ANU Mosquito…' }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <img src="/logo-256.webp" alt="" className="page-loader-logo" width="96" height="96" />
      <div className="page-loader-bar">
        <span />
      </div>
      <p>{label}</p>
    </div>
  )
}

export default PageLoader
