import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../supabase'
import './TokTokStoreAccountManager.css'

const LOGIN_HASH = ''

export default function TokTokStoreAccountManager({ store }) {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('')
  const [loginCode, setLoginCode] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadAccount = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await supabase.from('profiles').select('id,phone,full_name,username,university_id').eq('role', 'toktok_restaurant').eq('toktok_store_id', store.id).maybeSingle()
    if (loadError) { setError('تعذر تحميل بيانات حساب المطعم.'); setAccount(null) }
    else { setAccount(data || null); setLoginCode(/^\d{7}$/.test(data?.username || '') ? data.username : /^\d{7}$/.test(data?.university_id || '') ? data.university_id : '') }
    setLoading(false)
  }, [store.id])

  useEffect(() => { loadAccount() }, [loadAccount])

  async function submit(event) {
    event.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      const cleanCode = loginCode.replace(/\D/g, '')
      if (!/^\d{7}$/.test(cleanCode)) throw new Error('كود دخول المطعم لازم يكون 7 أرقام.')
      if (password.length < 6) throw new Error('كلمة المرور لازم تكون 6 أحرف على الأقل.')
      const { data, error: invokeError } = await supabase.functions.invoke('toktok-store-account', { body: { action: account ? 'reset_password' : 'create', store_id: store.id, login_code: cleanCode, password } })
      if (invokeError || !data?.success) {
        let message = data?.error || invokeError?.message || 'تعذر حفظ حساب المطعم.'
        if (invokeError?.context) { try { const body = await invokeError.context.json(); if (body?.error) message = body.error } catch { /* Keep the original message. */ } }
        throw new Error(message)
      }
      setPassword(''); setMode(''); setNotice(account ? 'تم تحديث كود الدخول وكلمة المرور.' : 'تم إنشاء حساب المطعم.')
      await loadAccount()
    } catch (submitError) { setError(submitError?.message || 'تعذر حفظ حساب المطعم.') }
    finally { setBusy(false) }
  }

  const loginUrl = window.location.origin + window.location.pathname + LOGIN_HASH
  return (
    <div className="tt-store-account">
      <div className="tt-store-account-head"><span className="tt-store-account-icon">🔐</span><div><strong>{loading ? 'حساب المطعم' : account ? 'حساب الدخول جاهز' : 'لم يتم إنشاء حساب بعد'}</strong>{!loading && account && <small>كود الدخول: {/^\d{7}$/.test(account.username || '') ? account.username : /^\d{7}$/.test(account.university_id || '') ? account.university_id : 'حدّث الكود من إعدادات الحساب'}</small>}{!loading && !account && <small>حدد كود دخول من 7 أرقام وكلمة مرور لتمكين دخول المطعم.</small>}</div></div>
      {!loading && !mode && <div className="tt-store-account-actions"><button type="button" onClick={() => { setError(''); setNotice(''); setMode(account ? 'reset' : 'create'); setPassword('') }}>{account ? 'تغيير كلمة المرور' : 'إضافة حساب المطعم'}</button><a href={loginUrl} target="_blank" rel="noreferrer">صفحة تسجيل الدخول الرئيسية ↗</a></div>}
      {mode && <form className="tt-store-account-form" onSubmit={submit}><label>كود دخول المطعم (7 أرقام)<input type="text" inputMode="numeric" maxLength="7" value={loginCode} onChange={(event) => setLoginCode(event.target.value.replace(/\D/g, '').slice(0, 7))} placeholder="1234567" required /></label><label>{account ? 'كلمة المرور الجديدة' : 'كلمة المرور'}<input type="password" minLength="6" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><div><button type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : account ? 'حفظ كلمة المرور' : 'إنشاء الحساب'}</button><button type="button" className="tt-store-account-cancel" onClick={() => { setMode(''); setError(''); setPassword('') }}>إلغاء</button></div></form>}
      {error && <p className="tt-store-account-error" role="alert">{error}</p>}{notice && <p className="tt-store-account-notice" role="status">{notice}</p>}
    </div>
  )
}
