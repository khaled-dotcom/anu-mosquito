import { useEffect, useId } from 'react'
import Icon from './Icon'

// Bottom sheet on phones, centred dialog on larger screens.
// Closes on Escape or a tap on the backdrop and locks page scroll while open.
function Sheet({ open, onClose, title, children, footer = null, className = '', hero = null }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`sheet ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        <span className="sheet-handle" aria-hidden="true" />

        <button
          type="button"
          className="sheet-close"
          onClick={onClose}
          aria-label="Close"
        >
          <Icon name="close" size={18} />
        </button>

        <div className="sheet-body">
          {hero}
          {title && (
            <h2 id={titleId} className="sheet-title">
              {title}
            </h2>
          )}
          {children}
        </div>

        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  )
}

export default Sheet
