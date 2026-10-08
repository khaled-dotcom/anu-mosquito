import './SaveButton.css'
function SaveButton({
  children = 'Save',
  onClick,
  disabled = false,
  type = 'submit',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`admin-primary-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default SaveButton