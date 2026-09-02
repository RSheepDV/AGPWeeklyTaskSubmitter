import './style.css'

const statusColors = {
  'Completed with extra stuff done': '#a4c2f4',
  Completed: '#d9ead3',
  'Partially complete (minimum 50% done)': '#facc15',
  'Not worked on': '#4b5563',
  'No longer working on project': '#d1d5db'
}

const escapeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const STORAGE_KEY = 'weekly-task-output'
const TEAM_MEMBERS_STORAGE_KEY = 'weekly-task-team-members'
const DEFAULT_TEAM_MEMBERS = ['Dean', 'Alex', 'Morgan', 'Taylor', 'Jordan', 'Casey', 'Riley', 'Jamie', 'Chris', 'Sam']

const state = {
  teamMembers: [],
  outputEntries: []
}

const getClipboardPayload = () => {
  const tasks = document.querySelector('#tasks')?.value.trim() || ''
  const status = document.querySelector('#status')?.value || 'Completed'
  const backgroundColor = statusColors[status] || '#ffffff'
  const singleLineTasks = tasks.replace(/\r?\n/g, ' ')
  const plainText = `${singleLineTasks}`
  const htmlContent = escapeHtml(tasks).replace(/\n/g, '<br>')

  return {
    plainText,
    html: `<table role="presentation" style="border-collapse: collapse; border-spacing: 0; margin: 0; width: 120px; height: 48px;"><tr><td bgcolor="${backgroundColor}" style="padding: 10px 12px; text-align: center; vertical-align: middle; color: #111827; font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; line-height: 1.2; white-space: normal;">${htmlContent}</td></tr></table>`,
    backgroundColor,
    text: tasks
  }
}

const renderPreview = () => {
  const payload = getClipboardPayload()
  const preview = document.querySelector('#output-preview')
  if (!preview) return

  const hasContent = payload.text.length > 0
  preview.textContent = hasContent ? payload.text : ''
  preview.style.backgroundColor = payload.backgroundColor
  preview.style.visibility = hasContent ? 'visible' : 'hidden'
}

const getOrderedOutputEntries = () => {
  const lowercaseMap = new Map()
  state.outputEntries.forEach((entry) => {
    lowercaseMap.set(entry.name.toLowerCase(), entry)
  })

  const orderedNames = [...state.teamMembers]
  state.outputEntries.forEach((entry) => {
    if (!orderedNames.some((name) => name.toLowerCase() === entry.name.toLowerCase())) {
      orderedNames.push(entry.name)
    }
  })

  const seen = new Set()
  return orderedNames
    .filter((name) => {
      const key = name.toLowerCase()
      if (key === '') {
        return true
      }
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((name) => {
      const normalizedName = name.trim()
      const existing = lowercaseMap.get(normalizedName.toLowerCase())
      if (existing) return existing

      return {
        name: normalizedName,
        text: '',
        color: '#eeeeee',
        isPlaceholder: true,
        submittedAt: Date.now()
      }
    })
}

const saveOutputEntries = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.outputEntries))
}

const loadOutputEntries = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      state.outputEntries = []
      return
    }

    const parsed = JSON.parse(saved)
    state.outputEntries = Array.isArray(parsed) ? parsed : []
  } catch (error) {
    state.outputEntries = []
  }
}

const renderOutputStack = () => {
  const sheet = document.querySelector('#output-sheet')
  if (!sheet) return

  const orderedEntries = getOrderedOutputEntries()

  if (orderedEntries.length === 0) {
    sheet.innerHTML = `
      <div class="spreadsheet-header">
        <div class="spreadsheet-header-cell"></div>
        <div class="spreadsheet-header-cell"></div>
      </div>
      <div class="spreadsheet-row">
        <div class="spreadsheet-row-label">1</div>
        <div class="spreadsheet-cell"><div class="output-preview" style="visibility:hidden;">placeholder</div></div>
      </div>
    `
    return
  }

  const rows = orderedEntries
    .map((entry, index) => `
      <div class="spreadsheet-row">
        <div class="spreadsheet-row-label">${escapeHtml(entry.name)}</div>
        <div class="spreadsheet-cell">
          <div class="output-preview" style="background-color:${entry.isPlaceholder ? '#eeeeee' : entry.color};">${entry.isPlaceholder ? '&nbsp;' : escapeHtml(entry.text)}</div>
        </div>
      </div>
      ${index < orderedEntries.length - 1 ? '<div class="spreadsheet-gap"></div>' : ''}
    `)
    .join('')

  sheet.innerHTML = `
    <div class="spreadsheet-header">
      <div class="spreadsheet-header-cell"></div>
      <div class="spreadsheet-header-cell"></div>
    </div>
    ${rows}
  `
}

const getNameOrder = (name) => {
  const index = state.teamMembers.indexOf(name)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

const addCurrentSubmission = () => {
  const nameInput = document.querySelector('#name')
  const taskInput = document.querySelector('#tasks')
  const name = nameInput?.value.trim() || 'Unknown'
  const tasks = taskInput?.value.trim() || 'Untitled task'
  const status = document.querySelector('#status')?.value || 'Completed'

  const existingEntry = state.outputEntries.find((entry) => entry.name.toLowerCase() === name.toLowerCase())

  if (existingEntry) {
    const shouldUpdate = window.confirm(`${name} is already in the output. Would you like to update this person's task?`)
    if (!shouldUpdate) {
      return
    }

    existingEntry.text = tasks
    existingEntry.color = statusColors[status] || '#ffffff'
    existingEntry.submittedAt = Date.now()

    state.outputEntries.sort((a, b) => {
      const orderDifference = getNameOrder(a.name) - getNameOrder(b.name)
      if (orderDifference !== 0) return orderDifference
      return a.submittedAt - b.submittedAt
    })
    saveOutputEntries()

    if (taskInput) {
      taskInput.value = ''
    }
    if (nameInput) {
      nameInput.value = ''
    }

    renderPreview()
    renderOutputStack()
    return
  }

  const entry = {
    name,
    text: tasks,
    color: statusColors[status] || '#ffffff',
    submittedAt: Date.now()
  }

  state.outputEntries.push(entry)
  state.outputEntries.sort((a, b) => {
    const orderDifference = getNameOrder(a.name) - getNameOrder(b.name)
    if (orderDifference !== 0) return orderDifference
    return a.submittedAt - b.submittedAt
  })
  saveOutputEntries()

  if (taskInput) {
    taskInput.value = ''
  }
  if (nameInput) {
    nameInput.value = ''
  }

  renderPreview()
  renderOutputStack()
}

const buildClipboardHtml = () => {
  const orderedEntries = getOrderedOutputEntries()
  const rows = orderedEntries
    .flatMap((entry, index) => {
      const cellText = entry.isPlaceholder ? '&nbsp;' : escapeHtml(entry.text).replace(/\n/g, '<br>')
      const backgroundColor = entry.isPlaceholder ? '#eeeeee' : entry.color
      const cell = `
        <tr>
          <td bgcolor="${backgroundColor}" style="padding: 10px 12px; text-align: center; vertical-align: middle; color: #111827; font-family: 'Montserrat', Arial, sans-serif; font-size: 12px; line-height: 1.2; white-space: normal;">${cellText}</td>
        </tr>
      `

      if (index < orderedEntries.length - 1) {
        return [cell, `<tr><td bgcolor="#cccccc" style="height: 6px; font-size: 0; line-height: 0; padding: 0;">&nbsp;</td></tr>`]
      }

      return [cell]
    })
    .join('')

  return `<table role="presentation" style="border-collapse: collapse; border-spacing: 0; margin: 0; width: 120px;">${rows}</table>`
}

const buildClipboardText = () => getOrderedOutputEntries().map((entry) => entry.isPlaceholder ? '' : entry.text).join('\n')

document.querySelector('#app').innerHTML = `
  <button id="menuToggle" class="menu-toggle" aria-label="Open team editor">☰</button>

  <aside id="teamDrawer" class="team-drawer" aria-label="Team members editor">
    <div class="drawer-header">
      <h2>Team Members</h2>
      <button id="closeDrawer" type="button" class="close-drawer" aria-label="Close team editor">×</button>
    </div>
    <textarea id="team-editor" rows="18" aria-label="Edit team members list"></textarea>
    <button id="saveTeamMembers" type="button" class="save-team-button">Save Team List</button>
  </aside>

  <main class="page-shell">
    <form class="status-form">
      <div class="form-header">
        <p class="eyebrow">Department Progress</p>
        <h1>Weekly Task Sheet Submitter</h1>
      </div>

      <div class="field-group">
        <label for="department">Department Name</label>
        <select id="department" name="department" aria-label="Department name">
          <option>Engineer</option>
          <option>Art</option>
          <option>Audio</option>
          <option>Design</option>
          <option>UI</option>
          <option>Usability</option>
          <option>Marketing</option>
          <option>QA</option>
          <option>Narrative</option>
        </select>
      </div>

      <div class="field-group">
        <label for="name">Name</label>
        <input id="name" name="name" type="text" value="" aria-label="Name" list="team-member-names" />
        <datalist id="team-member-names"></datalist>
      </div>

      <div class="field-group">
        <label for="tasks">Tasks</label>
        <textarea id="tasks" name="tasks" rows="5" aria-label="Tasks"></textarea>
      </div>

      <div class="field-group">
        <label for="status">Status</label>
        <select id="status" name="status" aria-label="Status">
          <option>Completed with extra stuff done</option>
          <option selected>Completed</option>
          <option>Partially complete (minimum 50% done)</option>
          <option>Not worked on</option>
          <option>No longer working on project</option>
        </select>
      </div>

      <button id="submitButton" type="button">Add to Output</button>
      <button id="clearButton" type="button" class="secondary-button" aria-label="Clear all output">
        <img src="trash-icon.svg" alt="Clear all output" />
      </button>
      <button id="copyButton" type="button" class="secondary-button">Copy Full Output</button>
    </form>

    <aside class="preview-panel">
      <div class="preview-wrapper">
        <label class="preview-label">Preview</label>
        <div id="output-sheet" class="spreadsheet-sheet"></div>
        <div class="sheet-note">Cells are stacked and sorted by team member order from the team-members file.</div>
      </div>
    </aside>
  </main>
`

const taskInput = document.querySelector('#tasks')
const statusInput = document.querySelector('#status')
taskInput.addEventListener('input', renderPreview)
statusInput.addEventListener('change', renderPreview)
renderPreview()

const saveTeamMembersToStorage = () => {
  localStorage.setItem(TEAM_MEMBERS_STORAGE_KEY, JSON.stringify(state.teamMembers))
}

const loadTeamMembers = () => {
  const datalist = document.querySelector('#team-member-names')
  if (!datalist) return

  try {
    const saved = localStorage.getItem(TEAM_MEMBERS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      state.teamMembers = Array.isArray(parsed) ? parsed : []
    } else {
      state.teamMembers = [...DEFAULT_TEAM_MEMBERS]
    }

    if (state.teamMembers.length === 0) {
      state.teamMembers = [...DEFAULT_TEAM_MEMBERS]
    }

    datalist.innerHTML = state.teamMembers
      .filter((name) => name.length > 0)
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join('')

    saveTeamMembersToStorage()
  } catch (error) {
    state.teamMembers = [...DEFAULT_TEAM_MEMBERS]
    datalist.innerHTML = state.teamMembers
      .filter((name) => name.length > 0)
      .map((name) => `<option value="${escapeHtml(name)}"></option>`)
      .join('')
    saveTeamMembersToStorage()
  }

  if (document.querySelector('#team-editor')) {
    document.querySelector('#team-editor').value = state.teamMembers.join('\n')
  }

  renderOutputStack()
}

loadOutputEntries()
loadTeamMembers()

const submitButton = document.querySelector('#submitButton')
submitButton.addEventListener('click', () => {
  addCurrentSubmission()
})

const menuToggle = document.querySelector('#menuToggle')
const teamDrawer = document.querySelector('#teamDrawer')
const closeDrawer = document.querySelector('#closeDrawer')
const teamEditor = document.querySelector('#team-editor')
const saveTeamMembersButton = document.querySelector('#saveTeamMembers')

const toggleDrawer = () => {
  const isOpen = teamDrawer.classList.toggle('open')
  menuToggle.style.visibility = isOpen ? 'hidden' : 'visible'
}

menuToggle.addEventListener('click', toggleDrawer)
closeDrawer.addEventListener('click', toggleDrawer)

saveTeamMembersButton.addEventListener('click', () => {
  const nextMembers = teamEditor.value
    .split(/\r?\n/)
    .map((name) => name.trim())

  state.teamMembers = nextMembers
  saveTeamMembersToStorage()

  const datalist = document.querySelector('#team-member-names')
  datalist.innerHTML = state.teamMembers
    .filter((name) => name.length > 0)
    .map((name) => `<option value="${escapeHtml(name)}"></option>`)
    .join('')

  renderOutputStack()
  toggleDrawer()
})

const clearButton = document.querySelector('#clearButton')
clearButton.addEventListener('click', () => {
  const confirmed = window.confirm('Clear all saved output cells?')
  if (!confirmed) return

  state.outputEntries = []
  saveOutputEntries()
  renderOutputStack()
})

const copyButton = document.querySelector('#copyButton')
copyButton.addEventListener('click', async () => {
  const text = buildClipboardText()
  const html = buildClipboardHtml()

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const textBlob = new Blob([text], { type: 'text/plain' })
      const htmlBlob = new Blob([html], { type: 'text/html' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          'text/html': htmlBlob
        })
      ])
    } else {
      await navigator.clipboard.writeText(text)
    }

    const originalText = copyButton.textContent
    copyButton.textContent = 'Copied!'
    setTimeout(() => {
      copyButton.textContent = originalText
    }, 1400)
  } catch (error) {
    console.error('Clipboard copy failed:', error)
    const originalText = copyButton.textContent
    copyButton.textContent = 'Copy failed'
    setTimeout(() => {
      copyButton.textContent = originalText
    }, 1800)
  }
})
