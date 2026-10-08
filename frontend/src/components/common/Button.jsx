import './Button.css'

function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
}) {
  const variantClass =
    variant === 'nav' ||
    variant === 'logout' ||
    variant === 'action' ||
    variant === 'view' ||
    variant === 'auth'
      ? className
      : 'admin-primary-button'

  return (
    <button
      type={type}
      className={variantClass}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button