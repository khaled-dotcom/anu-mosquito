import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../supabase'
import './TeamsManagement.css'

function TeamsManagement() {
  const [teams, setTeams] = useState([])
  const [students, setStudents] = useState([])
  const [members, setMembers] = useState([])
  const [memberCounts, setMemberCounts] = useState({})
  const [teamMemberIds, setTeamMemberIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    is_active: true,
  })

  const [selectedTeam, setSelectedTeam] = useState(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [membersLoading, setMembersLoading] = useState(false)

  async function loadTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, description, is_active, created_at')
      .order('name')

    if (error) throw error
    setTeams(data || [])
    await loadTeamMemberSummaries(data || [])
  }

  async function loadTeamMemberSummaries(teamRows = teams) {
    const { data, error } = await supabase
      .from('team_members')
      .select('team_id, student_id')

    if (error) throw error

    const idsByTeam = {}
    ;(data || []).forEach(({ team_id, student_id }) => {
      if (!idsByTeam[team_id]) idsByTeam[team_id] = []
      idsByTeam[team_id].push(student_id)
    })

    const counts = {}
    teamRows.forEach((team) => {
      counts[team.id] = (idsByTeam[team.id] || []).length
    })

    setTeamMemberIds(idsByTeam)
    setMemberCounts(counts)
  }

  async function loadStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, university_id, phone, is_active')
      .eq('role', 'student')
      .order('full_name')

    if (error) throw error
    setStudents(data || [])
  }

  async function loadMembers(teamId) {
    setMembersLoading(true)

    const { data, error } = await supabase
      .from('team_members')
      .select('id, student_id, created_at')
      .eq('team_id', teamId)

    setMembersLoading(false)

    if (error) {
      alert(error.message)
      return
    }

    setMembers(data || [])
    setSelectedStudentIds(new Set((data || []).map((member) => member.student_id)))
  }

  async function loadAll() {
    setLoading(true)

    try {
      await Promise.all([loadTeams(), loadStudents()])
    } catch (error) {
      console.error('Load teams error:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return teams

    return teams.filter((team) =>
      team.name.toLowerCase().includes(query) ||
      team.description?.toLowerCase().includes(query)
    )
  }, [teams, search])

  const filteredStudents = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()

    return students.filter((student) => {
      if (!query) return true

      return (
        student.full_name?.toLowerCase().includes(query) ||
        student.university_id?.toLowerCase().includes(query) ||
        student.phone?.toLowerCase().includes(query)
      )
    })
  }, [students, memberSearch])

  function openCreateTeam() {
    setEditingTeam(null)
    setTeamForm({
      name: '',
      description: '',
      is_active: true,
    })
    setShowTeamForm(true)
  }

  function openEditTeam(team) {
    setEditingTeam(team)
    setTeamForm({
      name: team.name || '',
      description: team.description || '',
      is_active: team.is_active,
    })
    setShowTeamForm(true)
  }

  async function saveTeam() {
    const name = teamForm.name.trim()

    if (!name) {
      alert('Team name is required.')
      return
    }

    setSaving(true)

    const payload = {
      name,
      description: teamForm.description.trim() || null,
      is_active: teamForm.is_active,
    }

    const result = editingTeam
      ? await supabase
          .from('teams')
          .update(payload)
          .eq('id', editingTeam.id)
          .select()
          .single()
      : await supabase
          .from('teams')
          .insert(payload)
          .select()
          .single()

    setSaving(false)

    if (result.error) {
      alert(result.error.message)
      return
    }

    setTeams((current) => {
      if (editingTeam) {
        return current.map((team) =>
          team.id === result.data.id ? result.data : team
        )
      }

      return [...current, result.data].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    })

    setShowTeamForm(false)
  }

  async function toggleTeam(team) {
    const { data, error } = await supabase
      .from('teams')
      .update({ is_active: !team.is_active })
      .eq('id', team.id)
      .select()
      .single()

    if (error) {
      alert(error.message)
      return
    }

    setTeams((current) =>
      current.map((item) => (item.id === data.id ? data : item))
    )

    if (selectedTeam?.id === data.id) {
      setSelectedTeam(data)
    }
  }

  async function openMembers(team) {
    setSelectedTeam(team)
    setMemberSearch('')
    await loadMembers(team.id)
  }

  function toggleStudent(studentId) {
    setSelectedStudentIds((current) => {
      const next = new Set(current)

      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }

      return next
    })
  }

  function selectAllVisible() {
    setSelectedStudentIds((current) => {
      const next = new Set(current)

      filteredStudents.forEach((student) => next.add(student.id))

      return next
    })
  }

  function clearAllVisible() {
    setSelectedStudentIds((current) => {
      const next = new Set(current)

      filteredStudents.forEach((student) => next.delete(student.id))

      return next
    })
  }

  async function saveMembers() {
    if (!selectedTeam) return

    setSaving(true)

    const existingIds = new Set(members.map((member) => member.student_id))
    const idsToAdd = [...selectedStudentIds].filter((id) => !existingIds.has(id))
    const idsToRemove = [...existingIds].filter((id) => !selectedStudentIds.has(id))

    // Apply only the changes. This avoids deleting all memberships first,
    // which could leave the team empty if a later insert fails.
    if (idsToRemove.length > 0) {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', selectedTeam.id)
        .in('student_id', idsToRemove)

      if (error) {
        setSaving(false)
        alert(error.message)
        return
      }
    }

    if (idsToAdd.length > 0) {
      const { error } = await supabase
        .from('team_members')
        .insert(idsToAdd.map((studentId) => ({
          team_id: selectedTeam.id,
          student_id: studentId,
        })))

      if (error) {
        setSaving(false)
        alert(error.message)
        await loadMembers(selectedTeam.id)
        await loadTeamMemberSummaries()
        return
      }
    }

    await loadMembers(selectedTeam.id)
    await loadTeamMemberSummaries()
    setSaving(false)
    alert('Team members saved successfully.')
  }

  const memberIds = new Set(members.map((member) => member.student_id))
  const activeStudents = students.filter((student) => student.is_active !== false)

  return (
    <div className="teams-management">
      <section className="teams-page-header">
        <div>
          <span className="teams-page-eyebrow">Group Management</span>
          <h2>Teams</h2>
          <p>Create teams and choose members from students already registered in ANU Mosquito.</p>
        </div>

        <button type="button" className="teams-primary-button" onClick={openCreateTeam}>
          + Add Team
        </button>
      </section>

      <section className="teams-stats-grid">
        <div className="teams-stat-card">
          <span>👥</span>
          <div>
            <small>Total Teams</small>
            <strong>{teams.length}</strong>
          </div>
        </div>

        <div className="teams-stat-card">
          <span>🎓</span>
          <div>
            <small>Registered Students</small>
            <strong>{activeStudents.length}</strong>
          </div>
        </div>

        <div className="teams-stat-card">
          <span>✅</span>
          <div>
            <small>Active Teams</small>
            <strong>{teams.filter((team) => team.is_active).length}</strong>
          </div>
        </div>
      </section>

      <section className="teams-section-card">
        <div className="teams-toolbar">
          <div className="teams-search">
            <span>🔎</span>
            <input
              type="text"
              placeholder="Search teams..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button type="button" className="teams-refresh-button" onClick={loadAll} disabled={loading}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="teams-empty">Loading teams...</div>
        ) : filteredTeams.length === 0 ? (
          <div className="teams-empty">
            <strong>No teams yet.</strong>
            <span>Create your first team to start assigning students.</span>
          </div>
        ) : (
          <div className="teams-grid">
            {filteredTeams.map((team) => (
              <article className="team-card" key={team.id}>
                <div className="team-card-top">
                  <div className="team-icon">👥</div>
                  <span className={team.is_active ? 'team-status active' : 'team-status'}>
                    {team.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3>{team.name}</h3>
                <p>{team.description || 'No description'}</p>

                <div className="team-card-meta">
                  <span>Members</span>
                  <strong>{memberCounts[team.id] ?? 0}</strong>
                </div>

                {(teamMemberIds[team.id] || []).length > 0 && (
                  <div className="team-card-member-preview">
                    {(teamMemberIds[team.id] || []).slice(0, 3).map((studentId) => {
                      const student = students.find((item) => item.id === studentId)
                      return (
                        <span key={studentId}>
                          {student?.full_name || student?.university_id || 'Student'}
                        </span>
                      )
                    })}
                    {(teamMemberIds[team.id] || []).length > 3 && (
                      <small>+{teamMemberIds[team.id].length - 3} more</small>
                    )}
                  </div>
                )}

                <div className="team-card-actions">
                  <button type="button" onClick={() => openMembers(team)}>
                    👤 Manage Members
                  </button>
                  <button type="button" onClick={() => openEditTeam(team)}>
                    ✏️ Edit
                  </button>
                  <button type="button" onClick={() => toggleTeam(team)}>
                    {team.is_active ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showTeamForm && (
        <div className="teams-modal-overlay">
          <div className="teams-modal small">
            <div className="teams-modal-header">
              <div>
                <span>{editingTeam ? 'Edit Team' : 'Create Team'}</span>
                <h3>{editingTeam ? editingTeam.name : 'New Team'}</h3>
              </div>
              <button type="button" onClick={() => setShowTeamForm(false)} disabled={saving}>×</button>
            </div>

            <div className="teams-modal-body">
              <label>
                Team Name
                <input
                  type="text"
                  placeholder="e.g. IEEE ANU"
                  value={teamForm.name}
                  onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                />
              </label>

              <label>
                Description
                <textarea
                  rows="3"
                  placeholder="Optional description"
                  value={teamForm.description}
                  onChange={(event) => setTeamForm({ ...teamForm, description: event.target.value })}
                />
              </label>

              <label className="teams-checkbox">
                <input
                  type="checkbox"
                  checked={teamForm.is_active}
                  onChange={(event) => setTeamForm({ ...teamForm, is_active: event.target.checked })}
                />
                Active team
              </label>
            </div>

            <div className="teams-modal-footer">
              <button type="button" onClick={() => setShowTeamForm(false)} disabled={saving}>Cancel</button>
              <button type="button" className="teams-primary-button" onClick={saveTeam} disabled={saving}>
                {saving ? 'Saving...' : 'Save Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTeam && (
        <div className="teams-modal-overlay">
          <div className="teams-modal members-modal">
            <div className="teams-modal-header">
              <div>
                <span>Team Members</span>
                <h3>{selectedTeam.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <div className="teams-member-toolbar">
              <div className="teams-search">
                <span>🔎</span>
                <input
                  type="text"
                  placeholder="Search students by name or University ID..."
                  value={memberSearch}
                  onChange={(event) => setMemberSearch(event.target.value)}
                />
              </div>

              <div className="teams-member-actions">
                <button type="button" onClick={selectAllVisible}>Select All</button>
                <button type="button" onClick={clearAllVisible}>Clear Visible</button>
              </div>
            </div>

            {membersLoading ? (
              <div className="teams-empty">Loading students...</div>
            ) : (
              <div className="teams-student-list">
                {filteredStudents.map((student) => {
                  const checked = selectedStudentIds.has(student.id)

                  return (
                    <label className={checked ? 'team-student selected' : 'team-student'} key={student.id}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(student.id)}
                      />

                      <div className="team-student-avatar">
                        {student.full_name?.charAt(0)?.toUpperCase() || 'S'}
                      </div>

                      <div className="team-student-info">
                        <strong>{student.full_name || 'Unknown Student'}</strong>
                        <span>{student.university_id || 'No University ID'}{student.phone ? ` · ${student.phone}` : ''}</span>
                      </div>
                    </label>
                  )
                })}

                {filteredStudents.length === 0 && (
                  <div className="teams-empty">No registered students found.</div>
                )}
              </div>
            )}

            <div className="teams-selection-summary">
              <strong>{selectedStudentIds.size}</strong> students selected
            </div>

            <div className="teams-modal-footer">
              <button type="button" onClick={() => setSelectedTeam(null)} disabled={saving}>Cancel</button>
              <button type="button" className="teams-primary-button" onClick={saveMembers} disabled={saving}>
                {saving ? 'Saving...' : 'Save Members'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamsManagement
