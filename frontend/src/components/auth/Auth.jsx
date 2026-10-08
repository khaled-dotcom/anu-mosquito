import './Auth.css'
import { supabase } from '../../supabase'
import { loginUser } from '../../services/authService'
import Button from '../common/Button'

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
  getAuthEmail,
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

    const authEmail = getAuthEmail(universityId)

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

  return (
    <div className="page">
      <div className="auth-card">

        <div className="logo-container">

          <img
            src="/logo.png"
            alt="ANU Mosquito Logo"
            className="logo-image"
          />

          <div className="brand-name">
            <span>ANU</span>{' '}
            <strong>Mosquito</strong>
          </div>

        </div>

        <p className="subtitle">
          {isRegister
            ? 'Create your student account'
            : 'Welcome back'}
        </p>

        <form onSubmit={handleSubmit}>

          {isRegister && (
            <div className="input-wrapper">

              <span className="input-icon">
                ♙
              </span>

              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) =>
                  setFullName(e.target.value)
                }
                required
              />

            </div>
          )}

          <div className="input-wrapper">

            <span className="input-icon">
              ▣
            </span>

            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              placeholder="ID"
              value={universityId}
              onChange={(e) =>
                setUniversityId(
                  e.target.value.replace(
                    /\D/g,
                    ''
                  )
                )
              }
              required
            />

          </div>

          {isRegister && (
            <div className="input-wrapper">

              <span className="input-icon">
                📱
              </span>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="Phone Number"
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                required
              />

            </div>
          )}

          <div className="input-wrapper">

            <span className="input-icon">
              🔒
            </span>

            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
              minLength={6}
            />

            <button
              type="button"
              className="password-button"
              onClick={() =>
                setShowPassword(
                  !showPassword
                )
              }
            >
              {showPassword
                ? '◉'
                : '◌'}
            </button>

          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading
              ? 'Please wait...'
              : isRegister
                ? 'Create Account  →'
                : 'Login  →'}
          </button>

        </form>

        {message && (
          <p className="message">
            {message}
          </p>
        )}

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
                Already have an account?{' '}
                <strong>
                  Login
                </strong>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <strong>
                  Create one
                </strong>
              </>
            )}
          </button>

          <span className="line"></span>

        </div>

      </div>
    </div>
  )
}

export default Auth