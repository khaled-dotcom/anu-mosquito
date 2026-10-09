import './Auth.css'
import { supabase } from '../../supabase'
import { loginUser } from '../../services/authService'
import Icon from '../common/Icon'

function Auth({
  isRegister,
  setIsRegister,
  showPassword,
  setShowPassword,
  fullName,
  setFullName,
  universityId,
  setUniversityId,
  phone,
  setPhone,
  password,
  setPassword,
  message,
  loading,
  setMessage,
  setLoading,
}) {
  async function handleSubmit(e) {
    e.preventDefault()

    setMessage('')

    if (!/^\d{7}$/.test(universityId)) {
      setMessage('ID must contain exactly 7 digits.')
      return
    }

    if (isRegister && universityId === '9000001') {
      setMessage('This ID is reserved for Admin login.')
      return
    }

    if (
      isRegister &&
      !/^01[0125]\d{8}$/.test(phone)
    ) {
      setMessage(
        'Please enter a valid Egyptian phone number.'
      )
      return
    }

    if (password.length < 6) {
      setMessage(
        'Password must be at least 6 characters.'
      )
      return
    }

    if (isRegister && !fullName.trim()) {
      setMessage('Please enter your full name.')
      return
    }

    setLoading(true)

    try {
      if (isRegister) {
        const { data, error } =
          await supabase.functions.invoke(
            'student-auth',
            {
              body: {
                university_id: universityId,
                password,
                full_name: fullName.trim(),
                phone,
              },
            }
          )

        if (error) {
          let errorMessage = error.message

          if (error.context) {
            try {
              const errorBody =
                await error.context.json()

              if (errorBody?.error) {
                errorMessage = errorBody.error
              }
            } catch {
              // Keep original error
            }
          }

          setMessage(errorMessage)
          setLoading(false)
          return
        }

        if (!data?.success) {
          setMessage(
            data?.error ||
              'Account creation failed.'
          )
          setLoading(false)
          return
        }

        const { error: loginError } =
  await loginUser(
    universityId,
    password
  )

        if (loginError) {
          setMessage(
            'Account created successfully. Please login with your University ID.'
          )
          setLoading(false)
          return
        }

        setMessage(
          'Account created successfully!'
        )
      } else {
        const { error } =
  await loginUser(
    universityId,
    password
  )

        if (error) {
          setMessage(
            'Invalid ID or password.'
          )
        } else {
          setMessage('Login successful!')
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      )
    }

    setLoading(false)
  }

  const isError =
    message &&
    !/success/i.test(message)

  return (
    <div className="auth-page">
      <aside className="auth-hero" aria-hidden="true">
        <div className="auth-hero-inner">
          <span className="auth-hero-badge">
            <Icon name="zap" size={14} /> Campus food delivery
          </span>

          <h2>
            Campus food, delivered fast.
          </h2>

          <p>
            Browse restaurants, order in seconds and track your delivery —
            all with your university ID.
          </p>

          <ul className="auth-hero-points">
            <li><Icon name="store" size={18} /> All campus restaurants in one place</li>
            <li><Icon name="clock" size={18} /> Scheduled delivery batches</li>
            <li><Icon name="shield" size={18} /> Secure student accounts</li>
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="logo-container">
            <img
              src={`${import.meta.env.BASE_URL}logo.webp`}
              alt="ANU Mosquito"
              className="logo-image"
              width="132"
              height="132"
            />
          </div>

          <h1 className="auth-title">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>

          <p className="subtitle">
            {isRegister
              ? 'Sign up with your university ID to start ordering.'
              : 'Log in with your ID to continue.'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <label className="input-wrapper">
                <span className="sr-only">Full name</span>
                <Icon name="user" size={18} className="input-icon" />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </label>
            )}

            <label className="input-wrapper">
              <span className="sr-only">ID</span>
              <Icon name="id" size={18} className="input-icon" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                maxLength={7}
                placeholder="University ID (7 digits)"
                value={universityId}
                onChange={(e) =>
                  setUniversityId(e.target.value.replace(/\D/g, ''))
                }
                required
              />
            </label>

            {isRegister && (
              <label className="input-wrapper">
                <span className="sr-only">Phone number</span>
                <Icon name="phone" size={18} className="input-icon" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={11}
                  placeholder="Phone number (01xxxxxxxxx)"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, ''))
                  }
                  required
                />
              </label>
            )}

            <label className="input-wrapper">
              <span className="sr-only">Password</span>
              <Icon name="lock" size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="password-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </label>

            {message && (
              <p
                className={isError ? 'message message-error' : 'message message-success'}
                role={isError ? 'alert' : 'status'}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              {loading ? (
                <span className="spinner" aria-label="Please wait" />
              ) : (
                <>
                  {isRegister ? 'Create account' : 'Log in'}
                  <Icon name="arrowRight" size={18} />
                </>
              )}
            </button>
          </form>

          <div className="switch-container">
            <span className="line"></span>
            <button
              type="button"
              className="switch-button"
              onClick={() => {
                setIsRegister(!isRegister)
                setMessage('')
              }}
            >
              {isRegister ? (
                <>
                  Already have an account? <strong>Log in</strong>
                </>
              ) : (
                <>
                  New here? <strong>Create an account</strong>
                </>
              )}
            </button>
            <span className="line"></span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Auth
