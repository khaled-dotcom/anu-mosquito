import OrderManagement from '../admin/orders/OrderManagement'

function ModeratorDashboard({ handleLogout }) {
  return (
    <div>
      <OrderManagement />

      <button
        onClick={handleLogout}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          padding: '10px 16px',
          border: 'none',
          borderRadius: '8px',
          background: '#dc2626',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Logout
      </button>
    </div>
  )
}

export default ModeratorDashboard