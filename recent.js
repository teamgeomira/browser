/**
 * recent.js - Avancerad panel för senaste filer
 * Visar senaste filerna med sökning, filtrering, snabbåtgärder och mer.
 * Behåller originalfilnamn vid nedladdning.
 */

(function() {
    // DOM-element
    let recentPanel = null;
    let recentList = null;
    let isPanelVisible = false;
    let searchQuery = '';
    let filterType = 'all';
    let sortOrder = 'newest';

    // Skapa panelen för senaste filer
    function createRecentPanel() {
        if (document.getElementById('recentFilesPanel')) return;

        const panelHTML = `
            <div id="recentFilesPanel" style="position:fixed; top:80px; right:20px; width:380px; max-height:80vh; background:#1e293b; border-radius:20px; border:1px solid #475569; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9000; backdrop-filter:blur(12px); transform:translateX(400px); opacity:0; transition:all 0.3s ease; pointer-events:none; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:14px 18px; background:#0f172a; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-clock" style="color:#f59e0b;"></i>
                        <span style="font-weight:600; font-size:0.95rem;">Senaste filer</span>
                        <span id="recentCount" style="background:#f59e0b; color:#0f172a; padding:1px 8px; border-radius:30px; font-size:0.7rem; font-weight:700;">0</span>
                    </div>
                    <button id="closeRecentBtn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
                
                <!-- Sök- och filterfält -->
                <div style="padding:12px 16px; background:#0f172a; border-bottom:1px solid #334155; flex-shrink:0;">
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:120px; position:relative;">
                            <i class="fas fa-search" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); color:#64748b; font-size:0.8rem;"></i>
                            <input type="text" id="recentSearchInput" placeholder="Sök filer..." 
                                   style="width:100%; padding:6px 10px 6px 30px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:#f1f5f9; font-size:0.8rem; outline:none;">
                        </div>
                        <select id="recentFilterSelect" style="padding:6px 10px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:#f1f5f9; font-size:0.8rem; outline:none; cursor:pointer;">
                            <option value="all">Alla typer</option>
                            <option value="image">Bilder</option>
                            <option value="video">Videor</option>
                            <option value="audio">Ljud</option>
                            <option value="document">Dokument</option>
                            <option value="archive">Arkiv</option>
                            <option value="code">Kod</option>
                            <option value="other">Övrigt</option>
                        </select>
                        <select id="recentSortSelect" style="padding:6px 10px; border-radius:8px; border:1px solid #334155; background:#1e293b; color:#f1f5f9; font-size:0.8rem; outline:none; cursor:pointer;">
                            <option value="newest">Senaste först</option>
                            <option value="oldest">Äldst först</option>
                            <option value="name">Namn A-Ö</option>
                            <option value="size">Störst först</option>
                        </select>
                    </div>
                </div>
                
                <div id="recentListContainer" style="padding:12px; overflow-y:auto; flex:1;">
                    <div id="recentList" style="display:flex; flex-direction:column; gap:10px;">
                        <!-- Filer renderas här -->
                    </div>
                </div>
                <div style="padding:8px 14px; background:#0f172a; border-top:1px solid #334155; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; font-size:0.6rem; color:#64748b;">
                    <span><i class="fas fa-sync-alt"></i> Uppdateras i realtid</span>
                    <span id="recentFileCount">0 filer</span>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = panelHTML;
        document.body.appendChild(div.firstElementChild);
        recentPanel = document.getElementById('recentFilesPanel');
        recentList = document.getElementById('recentList');

        // Stäng panel
        document.getElementById('closeRecentBtn').addEventListener('click', () => {
            toggleRecentPanel(false);
        });

        // Sök- och filterhändelser
        document.getElementById('recentSearchInput').addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderRecentFiles(getFilteredFiles());
        });

        document.getElementById('recentFilterSelect').addEventListener('change', (e) => {
            filterType = e.target.value;
            renderRecentFiles(getFilteredFiles());
        });

        document.getElementById('recentSortSelect').addEventListener('change', (e) => {
            sortOrder = e.target.value;
            renderRecentFiles(getFilteredFiles());
        });

        // Stäng vid klick utanför
        document.addEventListener('click', (e) => {
            if (isPanelVisible && recentPanel && !recentPanel.contains(e.target) && 
                !e.target.closest('#recentToggleBtn') && !e.target.closest('#recentFilesPanel')) {
                toggleRecentPanel(false);
            }
        });

        // Lyssna på nya filer i realtid
        setupRealtimeListener();
    }

    // Växla panelens synlighet
    function toggleRecentPanel(show) {
        if (!recentPanel) return;
        isPanelVisible = show !== undefined ? show : !isPanelVisible;
        if (isPanelVisible) {
            recentPanel.style.transform = 'translateX(0)';
            recentPanel.style.opacity = '1';
            recentPanel.style.pointerEvents = 'auto';
            loadRecentFiles();
            // Fokusera på sökfältet
            setTimeout(() => {
                const searchInput = document.getElementById('recentSearchInput');
                if (searchInput) searchInput.focus();
            }, 300);
        } else {
            recentPanel.style.transform = 'translateX(400px)';
            recentPanel.style.opacity = '0';
            recentPanel.style.pointerEvents = 'none';
        }
    }

    // Sätt upp realtidslyssnare för nya filer
    let recentFilesCache = [];

    function setupRealtimeListener() {
        const sharedRef = window.database.ref('shared_files');
        sharedRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                recentFilesCache = [];
                renderRecentFiles([]);
                return;
            }

            const allFiles = [];
            Object.keys(data).forEach(folder => {
                const folderFiles = data[folder];
                if (folderFiles && typeof folderFiles === 'object') {
                    Object.keys(folderFiles).forEach(fileId => {
                        const file = folderFiles[fileId];
                        if (file && file.filename) {
                            allFiles.push({
                                id: fileId,
                                filename: file.filename || 'okänt',
                                size: file.size || 0,
                                url: file.url || '',
                                type: file.type || '',
                                date: file.date || new Date().toISOString(),
                                folder: folder,
                                uploadedBy: file.uploadedBy || 'Användare',
                                timestamp: new Date(file.date || 0).getTime(),
                                fileType: getFileCategory(file.filename || '')
                            });
                        }
                    });
                }
            });

            allFiles.sort((a, b) => b.timestamp - a.timestamp);
            recentFilesCache = allFiles.slice(0, 50);
            renderRecentFiles(getFilteredFiles());
        });
    }

    // Filtrera och sortera filer
    function getFilteredFiles() {
        let files = [...recentFilesCache];

        // Filtrera på sökning
        if (searchQuery) {
            files = files.filter(f => 
                f.filename.toLowerCase().includes(searchQuery) ||
                f.folder.toLowerCase().includes(searchQuery)
            );
        }

        // Filtrera på typ
        if (filterType !== 'all') {
            files = files.filter(f => f.fileType === filterType);
        }

        // Sortera
        switch (sortOrder) {
            case 'newest':
                files.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'oldest':
                files.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case 'name':
                files.sort((a, b) => a.filename.localeCompare(b.filename));
                break;
            case 'size':
                files.sort((a, b) => b.size - a.size);
                break;
        }

        return files;
    }

    // Bestäm filkategori
    function getFileCategory(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const image = ['jpg','jpeg','png','gif','bmp','svg','webp','ico','tif','tiff','raw','psd','ai','eps','heic','cr2'];
        const video = ['mp4','avi','mov','mkv','wmv','flv','webm','m4v','mpeg','mpg','3gp'];
        const audio = ['mp3','wav','ogg','flac','aac','m4a','wma','aiff','alac'];
        const document = ['pdf','doc','docx','odt','xls','xlsx','csv','ppt','pptx','odp','txt','rtf','md'];
        const archive = ['zip','rar','7z','tar','gz','bz2','xz','iso'];
        const code = ['html','css','js','json','xml','php','py','java','c','cpp','sql','rb','go','ts','jsx','tsx'];
        
        if (image.includes(ext)) return 'image';
        if (video.includes(ext)) return 'video';
        if (audio.includes(ext)) return 'audio';
        if (document.includes(ext)) return 'document';
        if (archive.includes(ext)) return 'archive';
        if (code.includes(ext)) return 'code';
        return 'other';
    }

    // Renderera listan med senaste filer
    function renderRecentFiles(files) {
        if (!recentList) return;

        const count = document.getElementById('recentCount');
        const fileCount = document.getElementById('recentFileCount');
        if (count) count.textContent = files.length;
        if (fileCount) fileCount.textContent = files.length + ' filer';

        if (files.length === 0) {
            recentList.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#64748b;">
                    <i class="fas fa-inbox" style="font-size:2rem; display:block; margin-bottom:10px; opacity:0.5;"></i>
                    <p style="font-size:0.85rem;">${searchQuery ? 'Inga filer matchar sökningen' : 'Inga filer uppladdade än'}</p>
                </div>
            `;
            return;
        }

        // Visa max 20 filer i panelen
        const displayFiles = files.slice(0, 20);

        recentList.innerHTML = displayFiles.map(file => {
            const iconClass = getFileIcon(file.filename || '');
            const iconColor = getFileColor(file.filename || '');
            const folderName = getFolderDisplayName(file.folder) || file.folder || 'Allmänt';
            const timeAgo = getTimeAgo(file.timestamp);
            const fileSize = formatSize(file.size);
            const fileExt = file.filename.split('.').pop().toUpperCase() || '';

            return `
                <div class="recent-file-item" data-file-id="${file.id}" data-folder="${file.folder}" 
                     style="background:#0f172a; border-radius:12px; padding:12px; border:1px solid #334155; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:12px; position:relative;">
                    <div style="flex-shrink:0; width:40px; height:40px; display:flex; align-items:center; justify-content:center; background:#1e293b; border-radius:8px; color:${iconColor}; font-size:1.3rem;">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:500; font-size:0.85rem; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(file.filename)}">
                            ${escapeHtml(file.filename)}
                        </div>
                        <div style="display:flex; gap:8px; font-size:0.65rem; color:#94a3b8; flex-wrap:wrap; margin-top:2px;">
                            <span><i class="fas fa-folder"></i> ${escapeHtml(folderName)}</span>
                            <span>${fileSize}</span>
                            ${fileExt ? `<span>${fileExt}</span>` : ''}
                            ${timeAgo ? `<span><i class="far fa-clock"></i> ${timeAgo}</span>` : ''}
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; gap:4px;">
                        <button class="recent-download-btn" data-file-id="${file.id}" data-folder="${file.folder}" 
                                style="background:none; border:none; color:#3b82f6; cursor:pointer; padding:4px 6px; border-radius:6px;" title="Ladda ner">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="recent-copy-btn" data-file-id="${file.id}" data-folder="${file.folder}" 
                                style="background:none; border:none; color:#64748b; cursor:pointer; padding:4px 6px; border-radius:6px;" title="Kopiera länk">
                            <i class="fas fa-link"></i>
                        </button>
                        <button class="recent-open-btn" data-file-id="${file.id}" data-folder="${file.folder}" 
                                style="background:none; border:none; color:#f59e0b; cursor:pointer; padding:4px 6px; border-radius:6px;" title="Öppna i ny flik">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="recent-details-btn" data-file-id="${file.id}" data-folder="${file.folder}" 
                                style="background:none; border:none; color:#8b5cf6; cursor:pointer; padding:4px 6px; border-radius:6px;" title="Detaljer">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Lägg till händelselyssnare
        document.querySelectorAll('.recent-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.recent-download-btn') || 
                    e.target.closest('.recent-copy-btn') ||
                    e.target.closest('.recent-open-btn') ||
                    e.target.closest('.recent-details-btn')) return;
                const fileId = item.dataset.fileId;
                const folder = item.dataset.folder;
                const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
                if (file && file.url) {
                    downloadFile(file);
                }
            });
        });

        document.querySelectorAll('.recent-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                const folder = btn.dataset.folder;
                const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
                if (file) {
                    downloadFile(file);
                }
            });
        });

        document.querySelectorAll('.recent-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                const folder = btn.dataset.folder;
                const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
                if (file && file.url) {
                    copyToClipboard(file.url);
                    showToast('Länk kopierad: ' + file.filename);
                }
            });
        });

        document.querySelectorAll('.recent-open-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                const folder = btn.dataset.folder;
                const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
                if (file && file.url) {
                    window.open(file.url, '_blank');
                    showToast('Öppnar: ' + file.filename);
                }
            });
        });

        document.querySelectorAll('.recent-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                const folder = btn.dataset.folder;
                const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
                if (file) {
                    showFileDetails(file);
                }
            });
        });
    }

    // Visa detaljer om en fil
    function showFileDetails(file) {
        if (!file) return;
        const date = file.date ? new Date(file.date).toLocaleString('sv-SE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Okänt';

        const detailsHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
                <div style="display:flex; align-items:center; gap:12px; padding-bottom:12px; border-bottom:1px solid #334155;">
                    <div style="font-size:2.5rem; color:${getFileColor(file.filename || '')};">
                        <i class="fas ${getFileIcon(file.filename || '')}"></i>
                    </div>
                    <div>
                        <div style="font-weight:600; font-size:1rem; color:#f1f5f9;">${escapeHtml(file.filename)}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${formatSize(file.size)}</div>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; font-size:0.85rem;">
                    <div style="color:#94a3b8;">📁 Mapp:</div>
                    <div style="color:#e2e8f0;">${escapeHtml(getFolderDisplayName(file.folder) || file.folder || 'Allmänt')}</div>
                    <div style="color:#94a3b8;">📅 Uppladdad:</div>
                    <div style="color:#e2e8f0;">${date}</div>
                    <div style="color:#94a3b8;">📄 Typ:</div>
                    <div style="color:#e2e8f0;">${file.filename.split('.').pop().toUpperCase() || 'Okänd'}</div>
                    <div style="color:#94a3b8;">👤 Användare:</div>
                    <div style="color:#e2e8f0;">${escapeHtml(file.uploadedBy || 'Okänd')}</div>
                </div>
                <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="window.open('${file.url}', '_blank')" style="padding:6px 14px; background:#3b82f6; border:none; border-radius:8px; color:white; cursor:pointer; font-size:0.8rem;">
                        <i class="fas fa-external-link-alt"></i> Öppna
                    </button>
                    <button onclick="window.downloadFileFromRecent('${file.id}','${file.folder}')" style="padding:6px 14px; background:#10b981; border:none; border-radius:8px; color:white; cursor:pointer; font-size:0.8rem;">
                        <i class="fas fa-download"></i> Ladda ner
                    </button>
                    <button onclick="copyToClipboard('${file.url}')" style="padding:6px 14px; background:#f59e0b; border:none; border-radius:8px; color:#0f172a; cursor:pointer; font-size:0.8rem;">
                        <i class="fas fa-copy"></i> Kopiera länk
                    </button>
                </div>
            </div>
        `;
        
        if (window.visaModal) {
            window.visaModal('📄 Filinformation', detailsHTML);
        } else if (window.showModal) {
            window.showModal('📄 Filinformation', detailsHTML);
        } else {
            alert('📄 ' + file.filename + '\nStorlek: ' + formatSize(file.size) + '\nMapp: ' + getFolderDisplayName(file.folder) + '\nDatum: ' + date);
        }
    }

    // Ladda ner en fil - BEHÅLLER ORIGINALNAMMET
    function downloadFile(file) {
        if (!file || !file.url) {
            showToast('Kunde inte ladda ner filen', true);
            return;
        }
        try {
            // Använd fetch för att ladda ner med korrekt filnamn
            fetch(file.url)
                .then(response => {
                    if (!response.ok) throw new Error('Kunde inte hämta filen');
                    return response.blob();
                })
                .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = file.filename; // Originalfilnamnet bevaras
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                    showToast(`Laddar ner: ${file.filename}`);
                })
                .catch(error => {
                    // Fallback: öppna i ny flik om fetch misslyckas
                    window.open(file.url, '_blank');
                    showToast('Öppnar i ny flik: ' + file.filename);
                });
        } catch (error) {
            showToast('Fel vid nedladdning', true);
        }
    }

    // Exponera download-funktion för detaljmodalen
    window.downloadFileFromRecent = function(fileId, folder) {
        const file = recentFilesCache.find(f => f.id === fileId && f.folder === folder);
        if (file) {
            downloadFile(file);
        }
    };

    // Ladda om listan
    function loadRecentFiles() {
        if (recentFilesCache.length > 0) {
            renderRecentFiles(getFilteredFiles());
        } else {
            const sharedRef = window.database.ref('shared_files');
            sharedRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const allFiles = [];
                    Object.keys(data).forEach(folder => {
                        const folderFiles = data[folder];
                        if (folderFiles && typeof folderFiles === 'object') {
                            Object.keys(folderFiles).forEach(fileId => {
                                const file = folderFiles[fileId];
                                if (file && file.filename) {
                                    allFiles.push({
                                        id: fileId,
                                        filename: file.filename || 'okänt',
                                        size: file.size || 0,
                                        url: file.url || '',
                                        type: file.type || '',
                                        date: file.date || new Date().toISOString(),
                                        folder: folder,
                                        uploadedBy: file.uploadedBy || 'Användare',
                                        timestamp: new Date(file.date || 0).getTime(),
                                        fileType: getFileCategory(file.filename || '')
                                    });
                                }
                            });
                        }
                    });
                    allFiles.sort((a, b) => b.timestamp - a.timestamp);
                    recentFilesCache = allFiles.slice(0, 50);
                    renderRecentFiles(getFilteredFiles());
                }
            });
        }
    }

    // ==================== HJÄLPFUNKTIONER ====================
    
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image',
            'bmp': 'fa-file-image', 'svg': 'fa-file-image', 'webp': 'fa-file-image', 'ico': 'fa-file-image',
            'tif': 'fa-file-image', 'tiff': 'fa-file-image', 'raw': 'fa-file-image', 'psd': 'fa-file-image',
            'ai': 'fa-file-image', 'eps': 'fa-file-image', 'heic': 'fa-file-image', 'cr2': 'fa-file-image',
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'odt': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'csv': 'fa-file-csv',
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint', 'odp': 'fa-file-powerpoint',
            'txt': 'fa-file-alt', 'rtf': 'fa-file-alt', 'md': 'fa-file-alt',
            'mp4': 'fa-file-video', 'avi': 'fa-file-video', 'mov': 'fa-file-video', 'mkv': 'fa-file-video',
            'wmv': 'fa-file-video', 'flv': 'fa-file-video', 'webm': 'fa-file-video', 'm4v': 'fa-file-video',
            'mp3': 'fa-file-audio', 'wav': 'fa-file-audio', 'ogg': 'fa-file-audio', 'flac': 'fa-file-audio',
            'aac': 'fa-file-audio', 'm4a': 'fa-file-audio',
            'zip': 'fa-file-archive', 'rar': 'fa-file-archive', '7z': 'fa-file-archive', 'tar': 'fa-file-archive',
            'gz': 'fa-file-archive', 'bz2': 'fa-file-archive', 'xz': 'fa-file-archive',
            'dwg': 'fa-draw-polygon', 'dxf': 'fa-draw-polygon', 'rvt': 'fa-cubes', 'ifc': 'fa-cubes',
            'skp': 'fa-cube', '3ds': 'fa-cube', 'obj': 'fa-cube', 'stl': 'fa-cube', 'fbx': 'fa-cube',
            'exe': 'fa-cogs', 'msi': 'fa-cogs', 'bin': 'fa-file-binary',
            'html': 'fa-file-code', 'css': 'fa-file-code', 'js': 'fa-file-code', 'json': 'fa-file-code',
            'xml': 'fa-file-code', 'php': 'fa-file-code', 'py': 'fa-file-code', 'java': 'fa-file-code',
            'c': 'fa-file-code', 'cpp': 'fa-file-code', 'sql': 'fa-file-code', 'rb': 'fa-file-code',
            'go': 'fa-file-code', 'ts': 'fa-file-code', 'jsx': 'fa-file-code', 'tsx': 'fa-file-code'
        };
        return icons[ext] || 'fa-file';
    }

    function getFileColor(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const colors = {
            'jpg': '#ec4899', 'jpeg': '#ec4899', 'png': '#ec4899', 'gif': '#ec4899',
            'tif': '#ec4899', 'tiff': '#ec4899', 'psd': '#ec4899', 'raw': '#ec4899',
            'pdf': '#ef4444', 'doc': '#3b82f6', 'docx': '#3b82f6', 'xls': '#10b981', 'xlsx': '#10b981',
            'ppt': '#f59e0b', 'pptx': '#f59e0b', 'mp4': '#8b5cf6', 'mov': '#8b5cf6', 'avi': '#8b5cf6',
            'mp3': '#06b6d4', 'wav': '#06b6d4', 'zip': '#f97316', 'rar': '#f97316', '7z': '#f97316',
            'dwg': '#14b8a6', 'dxf': '#14b8a6', 'exe': '#ef4444', 'js': '#facc15', 'html': '#f97316',
            'css': '#3b82f6', 'json': '#f59e0b', 'py': '#3b82f6', 'java': '#dc2626'
        };
        return colors[ext] || '#94a3b8';
    }

    function getFolderDisplayName(folderKey) {
        const names = {
            'general': 'Allmänt',
            'documentos': 'Dokument',
            'imagenes': 'Bilder',
            'videos': 'Videor',
            'otros': 'Övrigt'
        };
        return names[folderKey] || folderKey || 'Allmänt';
    }

    function formatSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function getTimeAgo(timestamp) {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 10) return 'just nu';
        if (seconds < 60) return seconds + ' sek sedan';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + ' min sedan';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + ' h sedan';
        const days = Math.floor(hours / 24);
        if (days < 7) return days + ' d sedan';
        if (days < 30) return Math.floor(days / 7) + ' v sedan';
        return '';
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        } else {
            fallbackCopy(text);
        }
    }

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }

    function showToast(msg, isError = false) {
        if (window.showToast) window.showToast(msg, isError);
        else if (window.visaMeddelande) window.visaMeddelande(msg, isError);
        else console.log(msg);
    }

    // Exponera funktioner globalt
    window.toggleRecentPanel = toggleRecentPanel;
    window.showRecentFiles = function() { toggleRecentPanel(true); };
    window.recentFilesCache = recentFilesCache;

    // Lägg till knapp i headern
    function addRecentButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;
        const existing = document.getElementById('recentToggleBtn');
        if (existing) return;

        const btn = document.createElement('button');
        btn.id = 'recentToggleBtn';
        btn.className = 'btn btn-secondary';
        btn.innerHTML = '<i class="fas fa-clock"></i> Senaste';
        btn.style.cssText = 'padding:8px 16px; position:relative;';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleRecentPanel();
        });
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
                createRecentPanel();
                addRecentButton();
                console.log('✅ recent.js initierad');
            }
        }, 300);

        setTimeout(() => {
            if (!document.getElementById('recentToggleBtn')) {
                createRecentPanel();
                addRecentButton();
            }
        }, 3000);
    });
})();
