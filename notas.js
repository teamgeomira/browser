/**
 * notas.js - Delat anteckningsblock
 * Skapa, redigera, formatera, kopiera och ta bort anteckningar i realtid.
 * Synkroniseras via Firebase.
 */

(function() {
    // DOM-element
    let notebookModal = null;
    let notesContainer = null;

    // Öppna anteckningsblocket
    function openNotebook() {
        if (notebookModal) {
            notebookModal.style.display = 'flex';
            loadNotes();
            return;
        }
        createNotebookModal();
        loadNotes();
    }

    function closeNotebook() {
        if (notebookModal) {
            notebookModal.style.display = 'none';
        }
    }

    // Skapa modalen för anteckningsboken
    function createNotebookModal() {
        const modalHTML = `
            <div id="notebookModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:12000; justify-content:center; align-items:center; padding:20px;">
                <div style="background:#1e293b; border-radius:24px; max-width:900px; width:100%; max-height:90vh; display:flex; flex-direction:column; border:1px solid #475569; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <div style="padding:20px 24px; background:#0f172a; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                        <h2 style="font-size:1.4rem; display:flex; align-items:center; gap:12px; color:#f1f5f9;">
                            <i class="fas fa-book" style="color:#60a5fa;"></i> Delad anteckningsbok
                        </h2>
                        <div style="display:flex; gap:12px;">
                            <button id="addNoteBtn" class="btn btn-primary" style="padding:8px 16px;">
                                <i class="fas fa-plus"></i> Ny anteckning
                            </button>
                            <button id="closeNotebookBtn" style="background:none; border:none; color:#94a3b8; font-size:1.8rem; cursor:pointer;">&times;</button>
                        </div>
                    </div>
                    <div id="notesContainer" style="padding:20px; overflow-y:auto; flex:1; display:grid; grid-template-columns:repeat(auto-fill, minmax(280px,1fr)); gap:20px; align-content:start;">
                        <!-- Anteckningar renderas här -->
                    </div>
                    <div style="padding:12px 24px; background:#0f172a; border-top:1px solid #334155; font-size:0.7rem; color:#64748b; text-align:center; flex-shrink:0;">
                        <i class="fas fa-sync-alt"></i> Synkroniseras i realtid · Alla ändringar sparas automatiskt
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);
        notebookModal = document.getElementById('notebookModal');
        notesContainer = document.getElementById('notesContainer');

        // Event listeners
        document.getElementById('closeNotebookBtn').addEventListener('click', closeNotebook);
        document.getElementById('addNoteBtn').addEventListener('click', () => createNoteEditor());
        notebookModal.addEventListener('click', (e) => {
            if (e.target === notebookModal) closeNotebook();
        });

        // Lyssna på realtidsändringar från Firebase
        const notesRef = window.database.ref('notes');
        notesRef.on('value', (snapshot) => {
            renderNotes(snapshot.val());
        });
    }

    // Renderera anteckningarna som kort
    function renderNotes(notesData) {
        if (!notesContainer) return;
        if (!notesData) {
            notesContainer.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px; color:#94a3b8;">
                    <i class="fas fa-sticky-note" style="font-size:3rem; opacity:0.5; display:block; margin-bottom:12px;"></i>
                    <p>Inga anteckningar ännu. Skapa din första!</p>
                </div>
            `;
            return;
        }

        // Spara i cache för snabb åtkomst
        window._notesCache = notesData;

        // Sortera efter tid (senast först)
        const keys = Object.keys(notesData);
        const sortedKeys = keys.sort((a, b) => {
            return (notesData[b].timestamp || 0) - (notesData[a].timestamp || 0);
        });

        notesContainer.innerHTML = sortedKeys.map(key => {
            const note = notesData[key];
            const title = note.title || 'Namnlös anteckning';
            const content = note.content || '';
            const timestamp = note.timestamp ? new Date(note.timestamp).toLocaleString('sv-SE') : '';

            return `
                <div class="note-card" data-note-id="${key}" style="background:#0f172a; border-radius:16px; padding:16px; border:1px solid #334155; display:flex; flex-direction:column; gap:10px; transition: all 0.2s;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                        <h4 style="font-size:1rem; font-weight:600; color:#f1f5f9; word-break:break-word; margin:0;">${escapeHtml(title)}</h4>
                        <div style="display:flex; gap:4px; flex-shrink:0;">
                            <button class="edit-note-btn" data-note-id="${key}" style="background:none; border:none; color:#94a3b8; cursor:pointer; padding:4px; border-radius:6px;" title="Redigera">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="copy-note-btn" data-note-id="${key}" style="background:none; border:none; color:#94a3b8; cursor:pointer; padding:4px; border-radius:6px;" title="Kopiera">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button class="delete-note-btn" data-note-id="${key}" style="background:none; border:none; color:#94a3b8; cursor:pointer; padding:4px; border-radius:6px;" title="Radera">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="note-content" style="color:#cbd5e1; font-size:0.9rem; max-height:120px; overflow:hidden; position:relative;">
                        <div style="display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow:hidden;">${content}</div>
                        ${content.length > 200 ? `<span style="position:absolute; bottom:0; right:0; background:linear-gradient(to right, transparent, #0f172a 50%); padding-left:20px; color:#64748b;">...</span>` : ''}
                    </div>
                    <div style="font-size:0.65rem; color:#64748b; display:flex; justify-content:space-between; border-top:1px solid #1e293b; padding-top:8px; margin-top:4px;">
                        <span><i class="far fa-clock"></i> ${timestamp}</span>
                    </div>
                </div>
            `;
        }).join('');

        // Lägg till händelselyssnare för knappar
        document.querySelectorAll('.edit-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.noteId;
                const note = window._notesCache ? window._notesCache[id] : null;
                if (note) createNoteEditor(id, note);
            });
        });

        document.querySelectorAll('.copy-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.noteId;
                const note = window._notesCache ? window._notesCache[id] : null;
                if (note) {
                    const text = note.title + '\n' + note.content.replace(/<[^>]+>/g, '');
                    copyToClipboard(text);
                    showToast('Anteckning kopierad');
                }
            });
        });

        document.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.noteId;
                if (confirm('Radera anteckningen?')) {
                    window.database.ref('notes/' + id).remove();
                    showToast('Anteckning raderad');
                }
            });
        });
    }

    // Skapa/redigera anteckning i en editor-modal
    function createNoteEditor(noteId = null, noteData = null) {
        const isEdit = noteId !== null;
        const title = noteData ? noteData.title : '';
        const content = noteData ? noteData.content : '';

        const editorModal = document.createElement('div');
        editorModal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:13000;
            display:flex; justify-content:center; align-items:center; padding:20px;
        `;
        editorModal.innerHTML = `
            <div style="background:#1e293b; border-radius:24px; max-width:700px; width:100%; border:1px solid #475569; box-shadow:0 20px 60px rgba(0,0,0,0.6); display:flex; flex-direction:column; max-height:90vh;">
                <div style="padding:16px 20px; background:#0f172a; border-radius:24px 24px 0 0; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="font-size:1.1rem; color:#f1f5f9;">${isEdit ? 'Redigera anteckning' : 'Ny anteckning'}</h3>
                    <button class="close-editor-btn" style="background:none; border:none; color:#94a3b8; font-size:1.6rem; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:20px; overflow-y:auto; flex:1;">
                    <label style="display:block; font-weight:500; color:#cbd5e1; margin-bottom:4px;">Titel</label>
                    <input type="text" id="noteTitleInput" value="${escapeHtml(title)}" placeholder="Anteckningens titel..." style="width:100%; padding:10px 14px; border-radius:12px; border:1px solid #334155; background:#0f172a; color:#f1f5f9; font-size:1rem; margin-bottom:16px; outline:none;">

                    <label style="display:block; font-weight:500; color:#cbd5e1; margin-bottom:4px;">Innehåll</label>
                    <div style="background:#0f172a; border-radius:12px; border:1px solid #334155; padding:4px; margin-bottom:8px;">
                        <div style="display:flex; gap:4px; padding:4px; flex-wrap:wrap; border-bottom:1px solid #334155;">
                            <button class="format-btn" data-cmd="bold" title="Fet" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><b>B</b></button>
                            <button class="format-btn" data-cmd="italic" title="Kursiv" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><i>I</i></button>
                            <button class="format-btn" data-cmd="underline" title="Understruken" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><u>U</u></button>
                            <button class="format-btn" data-cmd="strikeThrough" title="Genomstruken" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><s>S</s></button>
                            <button class="format-btn" data-cmd="insertUnorderedList" title="Punktlista" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-list-ul"></i></button>
                            <button class="format-btn" data-cmd="insertOrderedList" title="Numrerad lista" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;"><i class="fas fa-list-ol"></i></button>
                            <button class="format-btn" data-cmd="formatBlock" data-value="h1" title="Rubrik 1" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;">H1</button>
                            <button class="format-btn" data-cmd="formatBlock" data-value="h2" title="Rubrik 2" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;">H2</button>
                            <button class="format-btn" data-cmd="formatBlock" data-value="h3" title="Rubrik 3" style="background:none; border:none; color:#94a3b8; padding:4px 8px; border-radius:6px; cursor:pointer;">H3</button>
                        </div>
                        <div id="noteContentEditor" contenteditable="true" style="min-height:180px; padding:12px; color:#e2e8f0; outline:none; font-size:0.95rem; line-height:1.6;">
                            ${content}
                        </div>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:4px;">
                        <i class="fas fa-info-circle"></i> Använd formateringsknapparna eller tangentbord (Ctrl+B, Ctrl+I, etc.)
                    </div>
                </div>
                <div style="padding:16px 20px; background:#0f172a; border-radius:0 0 24px 24px; border-top:1px solid #334155; display:flex; justify-content:flex-end; gap:12px;">
                    <button class="cancel-editor-btn" style="padding:8px 20px; background:#334155; border:none; border-radius:12px; color:#cbd5e1; cursor:pointer;">Avbryt</button>
                    <button class="save-note-btn" style="padding:8px 20px; background:#3b82f6; border:none; border-radius:12px; color:white; cursor:pointer; font-weight:600;">
                        <i class="fas fa-save"></i> Spara
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(editorModal);

        const contentEditor = editorModal.querySelector('#noteContentEditor');
        const titleInput = editorModal.querySelector('#noteTitleInput');

        // Formateringsknappar
        editorModal.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                const value = btn.dataset.value || null;
                document.execCommand(cmd, false, value);
                contentEditor.focus();
            });
        });

        // Stäng
        const closeEditor = () => {
            editorModal.remove();
        };
        editorModal.querySelector('.close-editor-btn').addEventListener('click', closeEditor);
        editorModal.querySelector('.cancel-editor-btn').addEventListener('click', closeEditor);
        editorModal.addEventListener('click', (e) => {
            if (e.target === editorModal) closeEditor();
        });

        // Spara
        editorModal.querySelector('.save-note-btn').addEventListener('click', () => {
            const newTitle = titleInput.value.trim() || 'Namnlös anteckning';
            const newContent = contentEditor.innerHTML;
            const noteData = {
                title: newTitle,
                content: newContent,
                timestamp: Date.now()
            };
            if (isEdit && noteId) {
                window.database.ref('notes/' + noteId).update(noteData);
                showToast('Anteckning uppdaterad');
            } else {
                window.database.ref('notes').push(noteData);
                showToast('Anteckning skapad');
            }
            closeEditor();
        });
    }

    // Ladda anteckningar (hanteras via on('value'))
    function loadNotes() {
        // Inget att göra – realtidslyssnaren sköter allt
    }

    // Hjälpfunktioner
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    }

    function showToast(msg, isError = false) {
        if (window.showToast) window.showToast(msg, isError);
        else if (window.visaMeddelande) window.visaMeddelande(msg, isError);
        else alert(msg);
    }

    // Exponera funktioner globalt
    window.openNotebook = openNotebook;
    window.closeNotebook = closeNotebook;

    // Lägg till knapp i headern
    function addNotebookButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;
        const existing = document.getElementById('notebookBtn');
        if (existing) return;

        const btn = document.createElement('button');
        btn.id = 'notebookBtn';
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-book"></i> Anteckningar';
        btn.style.cssText = 'padding:8px 16px;';
        btn.addEventListener('click', openNotebook);
        headerRight.appendChild(btn);
    }

    // Initiera
    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(() => {
        const checkInterval = setInterval(() => {
            if (window.database && document.querySelector('.header-right')) {
                clearInterval(checkInterval);
                addNotebookButton();
                console.log('✅ notas.js initierad');
            }
        }, 300);
        setTimeout(() => {
            if (!document.getElementById('notebookBtn')) {
                addNotebookButton();
            }
        }, 2000);
    });
})();