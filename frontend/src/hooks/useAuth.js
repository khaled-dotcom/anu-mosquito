import { useState } from 'react'
import { supabase } from '../supabase'
import { getAuthEmail, loginUser } from '../services/authService'

function useAuth() {
  const [isRegister, setIsRegister] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const [fullName, setFullName] = useState('')
  const [universityId, setUniversityId] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
      setMessage('Please enter a valid Egyptian phone number.')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
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
          await supabase.auth.signInWithPassword({
            email: authEmail,
            password,
          })

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
          setMessage('Invalid ID or password.')
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

  return {
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
    setMessage,

    loading,
    setLoading,

    handleSubmit,
  }
}

export default useAuth