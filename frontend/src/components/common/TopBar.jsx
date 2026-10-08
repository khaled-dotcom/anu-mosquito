import Icon from './Icon'

// Sticky app-style header: back button, title and an optional right-hand slot.
function TopBar({ title, subtitle, onBack, backLabel = 'Back', right = null }) {
  return (
    <header className="app-topbar">
      <div className="app-topbar-inner">
        {onBack ? (
          <button
            type="button"
            className="app-topbar-back"
            onClick={onBack}
            aria-label={backLabel}
          >
            <Icon name="chevronLeft" size={22} />
          </button>
        ) : (
          <span className="app-topbar-spacer" aria-hidden="true" />
        )}

        <div className="app-topbar-titles">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className="app-topbar-right">{right}</div>
      </div>
    </header>
  )
}

export default TopBar
