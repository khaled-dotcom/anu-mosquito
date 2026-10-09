import { useId, useRef, useState } from 'react'
import Icon from './Icon'
import { formatBytes, uploadCompressedImage } from '../../lib/image'
import './ImageUploader.css'

// Upload button with preview. Photos are compressed in the browser before
// they are stored, and the public URL is handed back through onChange.
function ImageUploader({ value, onChange, folder = 'food', label = 'Photo', shape = 'wide' }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function handleFile(file) {
    if (!file) return
    setBusy(true)
    setError('')
    setInfo('')

    try {
      const { url, bytes, originalBytes } = await uploadCompressedImage(file, folder)
      onChange(url)
      setInfo(`Compressed ${formatBytes(originalBytes)} → ${formatBytes(bytes)}`)
    } catch (err) {
      console.error('Image upload error:', err)
      setError(err?.message || 'Upload failed. Please try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className={`image-uploader shape-${shape}`}>
      <span className="image-uploader-label">{label}</span>

      <div
        className={`image-uploader-box ${value ? 'has-image' : ''} ${busy ? 'is-busy' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          handleFile(e.dataTransfer.files?.[0])
        }}
      >
        {value ? (
          <img src={value} alt="" className="image-uploader-preview" />
        ) : (
          <div className="image-uploader-empty" aria-hidden="true">
            <Icon name="upload" size={26} />
            <span>Add a photo</span>
          </div>
        )}

        {busy && (
          <div className="image-uploader-busy">
            <span className="image-uploader-spinner" aria-hidden="true" />
            Compressing…
          </div>
        )}
      </div>

      <div className="image-uploader-actions">
        <label htmlFor={inputId} className={`image-uploader-button ${busy ? 'disabled' : ''}`}>
          <Icon name="upload" size={16} />
          {value ? 'Change photo' : 'Upload photo'}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {value && !busy && (
          <button type="button" className="image-uploader-remove" onClick={() => { onChange(''); setInfo('') }}>
            Remove
          </button>
        )}
      </div>

      {info && <p className="image-uploader-info">{info}</p>}
      {error && <p className="image-uploader-error" role="alert">{error}</p>}
    </div>
  )
}

export default ImageUploader
