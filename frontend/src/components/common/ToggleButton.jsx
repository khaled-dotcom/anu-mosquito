import './ToggleButton.css'
function ToggleButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`admin-toggle-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default ToggleButton