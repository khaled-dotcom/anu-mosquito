import { useCallback, useEffect, useState } from 'react'
import ImageUploader from '../../common/ImageUploader'
import Icon from '../../common/Icon'
import {
  countDishesPerCategory,
  deleteHomeCategory,
  loadHomeCategories,
  saveHomeCategory,
  validateHomeCategory,
} from '../../../services/homeCategoryService'
import './HomeCategoryManagement.css'

const EMOJI_SUGGESTIONS = ['🍔', '🍕', '🍗', '🌯', '🥗', '🍝', '🍣', '🥤', '☕', '🍰', '🍟', '🌮']

function emptyForm(nextOrder = 0) {
  return { id: null, name: '', icon: '🍽️', image_url: '', sort_order: nextOrder, is_active: true }
}

// Categories shown on the student home page (Burgers, Pizza, Drinks...).
// Food items are linked to one of these from the Food & Menu screen.
function HomeCategoryManagement() {
  const [categories, setCategories] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    const [{ data, error }, { data: dishCounts }] = await Promise.all([
      loadHomeCategories({ includeInactive: true }),
      countDishesPerCategory(),
    ])
    if (error) setMessage(error.message)
    setCategories(data)
    setCounts(dishCounts || {})
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([loadHomeCategories({ includeInactive: true }), countDishesPerCategory()]).then(
      ([{ data, error }, { data: dishCounts }]) => {
        if (cancelled) return
        if (error) setMessage(error.message)
        setCategories(data)
        setCounts(dishCounts || {})
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    const problem = validateHomeCategory(form)
    if (problem) {
      setMessage(problem)
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await saveHomeCategory(form)
    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }
    setForm(null)
    setMessage(form.id ? 'Category updated.' : 'Category added.')
    refresh()
  }

  async function handleToggle(category) {
    const { error } = await saveHomeCategory({ ...category, is_active: !category.is_active })
    if (error) setMessage(error.message)
    refresh()
  }

  async function handleDelete(category) {
    const linked = counts[category.id] || 0
    const ok = window.confirm(
      linked > 0
        ? `Delete "${category.name}"? ${linked} food item(s) will no longer appear under it.`
        : `Delete "${category.name}"?`
    )
    if (!ok) return
    const { error } = await deleteHomeCategory(category.id)
    if (error) setMessage(error.message)
    refresh()
  }

  async function move(index, delta) {
    const target = index + delta
    if (target < 0 || target >= categories.length) return
    const a = categories[index]
    const b = categories[target]
    await Promise.all([
      saveHomeCategory({ ...a, sort_order: target + 1 }),
      saveHomeCategory({ ...b, sort_order: index + 1 }),
    ])
    refresh()
  }

  return (
    <section className="admin-section-card home-cats">
      <div className="admin-section-heading">
        <div>
          <h2>Home Categories</h2>
          <p>The category chips students see on the home page. Link food to them in Food &amp; Menu.</p>
        </div>
        {!form && (
          <button type="button" className="admin-primary-button" onClick={() => { setMessage(''); setForm(emptyForm(categories.length + 1)) }}>
            + Add Category
          </button>
        )}
      </div>

      {message && <div className="home-cats-message" role="status">{message}</div>}

      {form && (
        <div className="admin-form-card home-cats-form">
          <div className="home-cats-form-grid">
            <div className="home-cats-fields">
              <div className="admin-form-group">
                <label htmlFor="home-cat-name">Name</label>
                <input
                  id="home-cat-name"
                  value={form.name}
                  maxLength={40}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Burgers"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="home-cat-icon">Emoji</label>
                <div className="home-cats-emoji-row">
                  <input
                    id="home-cat-icon"
                    className="home-cats-emoji-input"
                    value={form.icon || ''}
                    maxLength={8}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  />
                  <div className="home-cats-emoji-picks">
                    {EMOJI_SUGGESTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className={form.icon === emoji ? 'active' : ''}
                        onClick={() => setForm({ ...form, icon: emoji })}
                        aria-label={`Use ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="food-form-check">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Show on the home page
              </label>
            </div>

            <ImageUploader
              label="Photo (optional)"
              folder="category"
              shape="square"
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            />
          </div>

          <div className="admin-form-actions">
            <button type="button" className="admin-cancel-button" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="admin-primary-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : form.id ? 'Save changes' : 'Add category'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="admin-empty">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="admin-empty">No categories yet. Add one to show it on the student home page.</div>
      ) : (
        <div className="home-cats-grid">
          {categories.map((category, index) => (
            <article key={category.id} className={`home-cats-card ${category.is_active ? '' : 'is-hidden'}`}>
              <div className="home-cats-visual">
                {category.image_url ? (
                  <img src={category.image_url} alt="" />
                ) : (
                  <span aria-hidden="true">{category.icon || '🍽️'}</span>
                )}
              </div>
              <div className="home-cats-info">
                <strong>{category.name}</strong>
                <span>
                  {counts[category.id] || 0} dish{(counts[category.id] || 0) === 1 ? '' : 'es'} linked
                  {category.is_active ? '' : ' · hidden'}
                </span>
              </div>
              <div className="home-cats-actions">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${category.name} earlier`}>
                  <Icon name="chevronLeft" size={16} />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Move ${category.name} later`}>
                  <Icon name="chevronRight" size={16} />
                </button>
                <button type="button" onClick={() => handleToggle(category)}>
                  {category.is_active ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => { setMessage(''); setForm({ ...category, image_url: category.image_url || '', icon: category.icon || '' }) }}>
                  Edit
                </button>
                <button type="button" className="danger" onClick={() => handleDelete(category)} aria-label={`Delete ${category.name}`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HomeCategoryManagement
