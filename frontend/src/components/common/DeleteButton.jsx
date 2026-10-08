import './DeleteButton.css'
function DeleteButton({
  children = 'Delete',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`admin-delete-button ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default DeleteButton