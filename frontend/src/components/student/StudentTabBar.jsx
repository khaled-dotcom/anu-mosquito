import { useCallback, useState } from 'react'
import Icon from '../common/Icon'
import Sheet from '../common/Sheet'

// Bottom navigation shown on phones for the student area.
function StudentTabBar({ active, profile, setStudentPage, handleLogout }) {
  const [showAccount, setShowAccount] = useState(false)
  const closeAccount = useCallback(() => setShowAccount(false), [])

  return (
    <>
      <nav className="student-tabbar" aria-label="Main">
        <button
          type="button"
          className={active === 'home' ? 'active' : ''}
          aria-current={active === 'home' ? 'page' : undefined}
          onClick={() => {
            setStudentPage('home')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          <Icon name="home" size={22} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={active === 'orders' ? 'active' : ''}
          aria-current={active === 'orders' ? 'page' : undefined}
          onClick={() => setStudentPage('orders')}
        >
          <Icon name="receipt" size={22} />
          <span>Orders</span>
        </button>

        <button
          type="button"
          className={showAccount ? 'active' : ''}
          onClick={() => setShowAccount(true)}
        >
          <Icon name="user" size={22} />
          <span>Account</span>
        </button>
      </nav>

      <Sheet open={showAccount} onClose={closeAccount} title="Account">
        <div className="account-card">
          <div className="account-avatar" aria-hidden="true">
            {(profile?.full_name || 'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{profile?.full_name || 'Student'}</strong>
            <span>University ID {profile?.university_id || '—'}</span>
            {profile?.phone && <span>{profile.phone}</span>}
          </div>
        </div>

        <button
          type="button"
          className="btn-secondary btn-block account-logout"
          onClick={() => {
            setShowAccount(false)
            handleLogout()
          }}
        >
          <Icon name="logout" size={18} />
          Log out
        </button>
      </Sheet>
    </>
  )
}

export default StudentTabBar
