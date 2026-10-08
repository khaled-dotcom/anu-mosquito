import './EditButton.css'
function EditButton({
  children = 'Edit',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`admin-edit-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default EditButton