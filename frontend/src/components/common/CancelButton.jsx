import './CancelButton.css'
function CancelButton({
  children = 'Cancel',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`admin-secondary-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default CancelButton