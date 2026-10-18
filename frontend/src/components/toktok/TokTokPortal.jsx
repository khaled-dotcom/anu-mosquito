import Icon from '../common/Icon'
import './TokTokPortal.css'

/**
 * Embeds the independently deployed ANU TokTok app inside ANU Mosquito.
 * TokTok uses its own frontend deployment, Supabase project, auth and admin UI.
 * Configure the appropriate URL in the host build environment.
 */
function TokTokPortal({ mode = 'customer', onBack }) {
  const isAdmin = mode === 'admin'
  const appUrl = isAdmin
    ? import.meta.env.VITE_TOKTOK_ADMIN_URL
    : import.meta.env.VITE_TOKTOK_CUSTOMER_URL

  if (!appUrl) {
    return (
      <section className="toktok-portal">
        {!isAdmin && (
          <div className="toktok-portal__toolbar">
            <button type="button" className="toktok-portal__back" onClick={onBack}>
              <Icon name="arrow-left" size={18} />
              <span>Back to ANU Mosquito</span>
            </button>
          </div>
        )}
        <div className="toktok-portal__setup">
          <div className="toktok-portal__mark" aria-hidden="true">🛍️</div>
          <h1>ANU TokTok</h1>
          <p>
            {isAdmin
              ? 'The independent TokTok management dashboard will appear here after its deployment is configured.'
              : 'ANU TokTok is being prepared. Please check back soon.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={`toktok-portal ${isAdmin ? 'toktok-portal--admin' : ''}`}>
      {!isAdmin && (
        <div className="toktok-portal__toolbar">
          <button type="button" className="toktok-portal__back" onClick={onBack}>
            <Icon name="arrow-left" size={18} />
            <span>Back to ANU Mosquito</span>
          </button>
          <strong>ANU TokTok</strong>
        </div>
      )}
      <iframe
        className="toktok-portal__frame"
        src={appUrl}
        title={isAdmin ? 'ANU TokTok Management' : 'ANU TokTok'}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="clipboard-read; clipboard-write"
      />
    </section>
  )
}

export default TokTokPortal
