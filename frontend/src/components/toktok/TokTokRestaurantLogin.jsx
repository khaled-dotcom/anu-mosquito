import { useState } from 'react'
import { supabase } from '../../supabase'
import './TokTokRestaurant.css'

export default function TokTokRestaurantLogin() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const cleanPhone = phone.replace(/\D/g, '')
    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setError('من فضلك أدخل رقم موبايل مصري صحيح.')
      return
    }
    if (!password) {
      setError('اكتب كلمة المرور.')
      return
    }
    setLoading(true)
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: 'toktok-' + cleanPhone + '@login.anumosquito.com',
        password,
      })
      if (loginError) throw loginError
    } catch {
      setError('رقم الموبايل أو كلمة المرور غير صحيحة.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="tt-restaurant-login-page" dir="rtl">
      <section className="tt-restaurant-login-card">
        <div className="tt-restaurant-brand-mark" aria-hidden="true">TT</div>
        <span className="tt-restaurant-eyebrow">ANU TOKTOK · RESTAURANT</span>
        <h1>تسجيل دخول المطعم</h1>
        <p className="tt-restaurant-login-subtitle">ادخل ببيانات الدخول اللي الإدارة خصصتها لمطعمك.</p>
        <form onSubmit={handleSubmit}>
          <label>رقم موبايل المطعم<input type="tel" inputMode="numeric" autoComplete="username" maxLength={11} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="01xxxxxxxxx" required /></label>
          <label>كلمة المرور<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة المرور" required /></label>
          {error && <p className="tt-restaurant-login-error" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'جاري تسجيل الدخول…' : 'دخول لوحة المطعم'}</button>
        </form>
        <a className="tt-restaurant-home-link" href={window.location.pathname}>العودة للصفحة الرئيسية</a>
      </section>
    </main>
  )
}
