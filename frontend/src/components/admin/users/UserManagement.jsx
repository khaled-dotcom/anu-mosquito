import { useEffect, useMemo, useState } from 'react'
import './UserManagement.css'
import {
  loadUsers,
  updateUser,
} from '../../../services/userService'

const ROLE_OPTIONS = [
  'student',
  'admin',
  'moderator',
  'driver',
]

function getRoleLabel(role) {
  const labels = {
    student: 'Student',
    admin: 'Admin',
    moderator: 'Moderator',
    driver: 'Driver',
  }

  return labels[role] || role || 'Unknown'
}

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    role: 'student',
  })

  async function fetchUsers() {
    setLoading(true)

    const { data, error } = await loadUsers()

    setLoading(false)

    if (error) {
      console.error('Load users error:', error)
      alert(error.message)
      return
    }

    setUsers(data || [])
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesRole =
        roleFilter === 'all' ||
        user.role === roleFilter

      if (!matchesRole) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        user.full_name?.toLowerCase().includes(query) ||
        user.university_id?.toLowerCase().includes(query) ||
        user.phone?.toLowerCase().includes(query)
      )
    })
  }, [users, search, roleFilter])

  const stats = {
    total: users.length,
    students: users.filter(
      (user) => user.role === 'student'
    ).length,
    admins: users.filter(
      (user) => user.role === 'admin'
    ).length,
    moderators: users.filter(
      (user) => user.role === 'moderator'
    ).length,
    drivers: users.filter(
      (user) => user.role === 'driver'
    ).length,
  }

  function openEdit(user) {
    setEditingUser(user)

    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'student',
    })
  }

  function closeEdit() {
    if (saving) {
      return
    }

    setEditingUser(null)
  }

  async function handleSave() {
    if (!editingUser) {
      return
    }

    const fullName = editForm.full_name.trim()
    const phone = editForm.phone.trim()

    if (!fullName) {
      alert('Full name is required.')
      return
    }

    if (!phone) {
      alert('Phone number is required.')
      return
    }

    if (!ROLE_OPTIONS.includes(editForm.role)) {
      alert('Please select a valid role.')
      return
    }

    setSaving(true)

    const { data, error } = await updateUser(
      editingUser.id,
      {
        full_name: fullName,
        phone,
        role: editForm.role,
      }
    )

    setSaving(false)

    if (error) {
      console.error('Update user error:', error)
      alert(error.message)
      return
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === data.id ? data : user
      )
    )

    setEditingUser(null)
  }

  return (
    <div className="user-management">

      <section className="user-page-header">
        <div>
          <span className="user-page-eyebrow">
            Account Management
          </span>

          <h2>
            Users
          </h2>

          <p>
            View and manage registered ANU Mosquito accounts.
          </p>
        </div>
      </section>

      <section className="user-stats-grid">

        <div className="user-stat-card">
          <span className="user-stat-icon">👥</span>
          <div>
            <span>Total Users</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <span className="user-stat-icon">🎓</span>
          <div>
            <span>Students</span>
            <strong>{stats.students}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <span className="user-stat-icon">🛡️</span>
          <div>
            <span>Admins</span>
            <strong>{stats.admins}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <span className="user-stat-icon">👤</span>
          <div>
            <span>Moderators</span>
            <strong>{stats.moderators}</strong>
          </div>
        </div>

        <div className="user-stat-card">
          <span className="user-stat-icon">🚚</span>
          <div>
            <span>Drivers</span>
            <strong>{stats.drivers}</strong>
          </div>
        </div>

      </section>

      <section className="user-section-card">

        <div className="user-toolbar">

          <div className="user-search-wrapper">
            <span>🔎</span>

            <input
              type="text"
              placeholder="Search by name, University ID or phone..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            className="user-role-filter"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value)
            }
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
            <option value="driver">Drivers</option>
          </select>

          <button
            type="button"
            className="user-refresh-button"
            onClick={fetchUsers}
            disabled={loading}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>

        </div>

        {loading ? (
          <div className="user-empty">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="user-empty">
            No users found.
          </div>
        ) : (
          <div className="user-table-wrapper">

            <table className="user-table">

              <thead>
                <tr>
                  <th>User</th>
                  <th>University ID</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {filteredUsers.map((user) => (
                  <tr key={user.id}>

                    <td>
                      <div className="user-name-cell">
                        <div className="user-avatar">
                          {user.full_name
                            ?.charAt(0)
                            ?.toUpperCase() || 'U'}
                        </div>

                        <div>
                          <strong>
                            {user.full_name || 'Unknown User'}
                          </strong>

                          <span>
                            {user.role === 'admin'
                              ? 'Administrator'
                              : 'ANU Mosquito Account'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>
                        {user.university_id || '—'}
                      </strong>
                    </td>

                    <td>
                      {user.phone || '—'}
                    </td>

                    <td>
                      <span
                        className={`user-role-badge role-${user.role}`}
                      >
                        {getRoleLabel(user.role)}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(
                            user.created_at
                          ).toLocaleDateString('en-GB')
                        : '—'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="user-edit-button"
                        onClick={() => openEdit(user)}
                      >
                        ✏️ Edit
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {editingUser && (
        <div className="user-modal-overlay">

          <div className="user-modal">

            <div className="user-modal-header">

              <div>
                <span>Edit Account</span>
                <h3>
                  {editingUser.full_name}
                </h3>
              </div>

              <button
                type="button"
                className="user-modal-close"
                onClick={closeEdit}
                disabled={saving}
              >
                ×
              </button>

            </div>

            <div className="user-modal-body">

              <div className="user-readonly-box">
                <span>University ID</span>
                <strong>
                  {editingUser.university_id || '—'}
                </strong>
              </div>

              <label>
                Full Name
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      full_name: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  maxLength="11"
                  value={editForm.phone}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      phone: event.target.value,
                    })
                  }
                />
              </label>

              <label>
                Role
                <select
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                  <option value="driver">Driver</option>
                </select>
              </label>

              <p className="user-modal-note">
                University ID is read-only because it is linked to the
                account authentication.
              </p>

            </div>

            <div className="user-modal-footer">

              <button
                type="button"
                className="user-cancel-button"
                onClick={closeEdit}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="user-save-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}

export default UserManagement
