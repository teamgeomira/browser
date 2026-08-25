/**
 * recent.js - Visa senast tillagda filer
 * Visar en lista över de 10 senast uppladdade filerna i realtid.
 * Klicka på en fil för att ladda ner eller visa detaljer.
 */

(function() {
    // DOM-element
    let recentPanel = null;
    let recentList = null;
    let isPanelVisible = false;

    // Skapa panelen för senaste filer
    function createRecentPanel() {
        if (document.getElementById('recentFilesPanel')) return;

        const panelHTML = `
            <div id="recentFilesPanel" style="position:fixed; top:80px; right:20px; width:320px; max-height:70vh; background:#1e293b; border-radius:20px; border:1px solid #475569; box-shadow:0 10px 30px rgba(0,0,0,0.5); z-index:9000; backdrop-filter:blur(12px); transform:translateX(350px); opacity:0; transition:all 0.3s ease; pointer-events:none; overflow:hidden; display:flex; flex-direction:column;">
                <div style="padding:14px 18px; background:#0f172a; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-clock" style="color:#f59e0b;"></i>
                        <span style="font-weight:600; font-size:0.95rem;">Senaste filer</span>
                        <span id="recentCount" style="background:#f59e0b; color:#0f172a; padding:1px 8px; border-radius:30px; font-size:0.7rem; font-weight:700;">0</span>
                    </div>
                    <button id="closeRecentBtn" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:1.2rem;">&times;</button>
                </div>
                <div id="recentListContainer" style="padding:12px; overflow-y:auto; flex:1;">
                    <div id="recentList" style="display:flex; flex-direction:column; gap:10px;">
                        <!-- Filer renderas här -->
                    </div>
                </div>
                <div style="padding:8px 14px; background:#0f172a; border-top:1px solid #334155; font-size:0.6rem; color:#64748b; text-align:center; flex-shrink:0;">
                    <i class="fas fa-sync-alt"></i> Uppdateras i realtid · Klicka på en fil för att ladda ner
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
        } else {
            recentPanel.style.transform = 'translateX(350px)';
            recentPanel.style.opacity = '0';
            recentPanel.style.pointerEvents = 'none';
        }
    }

    // Sätt upp realtidslyssnare för nya filer
    let recentFilesCache = [];
    let currentFolder = 'general';
    let allFolders = [];

    function setupRealtimeListener() {
        // Lyssna på alla mappar för att få senaste filer
        const sharedRef = window.database.ref('shared_files');
        sharedRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) {
                recentFilesCache = [];
                renderRecentFiles([]);
                return;
            }

            // Samla alla filer från alla mappar
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
                                timestamp: new Date(file.date || 0).getTime()
                            });
                        }
                    });
                }
            });

            // Sortera efter datum (senast först)
            allFiles.sort((a, b) => b.timestamp - a.timestamp);
            
            // Spara i cache (max 30 filer)
            recentFilesCache = allFiles.slice(0, 30);
            
            // Uppdatera visningen
            renderRecentFiles(recentFilesCache);
        });
    }

    // Renderera listan med senaste filer
    function renderRecentFiles(files) {
        if (!recentList) return;

        const count = document.getElementById('recentCount');
        if (count) count.textContent = files.length;

        if (files.length === 0) {
            recentList.innerHTML = `
                <div style="text-align:center; padding:30px 10px; color:#64748b;">
                    <i class="fas fa-inbox" style="font-size:2rem; display:block; margin-bottom:10px; opacity:0.5;"></i>
                    <p style="font-size:0.85rem;">Inga filer uppladdade än</p>
                </div>
            `;
            return;
        }

        // Visa max 10 filer i panelen
        const displayFiles = files.slice(0, 10);

        recentList.innerHTML = displayFiles.map(file => {
            const iconClass = getFileIcon(file.filename || '');
            const iconColor = getFileColor(file.filename || '');
            const date = file.date ? new Date(file.date).toLocaleString('sv-SE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : '';
            const folderName = getFolderDisplayName(file.folder) || file.folder || 'Allmänt';
            const timeAgo = getTimeAgo(file.timestamp);

            return `
                <div class="recent-file-item" data-file-id="${file.id}" data-folder="${file.folder}" 
                     style="background:#0f172a; border-radius:12px; padding:12px; border:1px solid #334155; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; gap:12px;">
                    <div style="flex-shrink:0; width:36px; height:36px; display:flex; align-items:center; justify-content:center; background:#1e293b; border-radius:8px; color:${iconColor}; font-size:1.2rem;">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-weight:500; font-size:0.85rem; color:#f1f5f9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(file.filename)}">
                            ${escapeHtml(file.filename)}
                        </div>
                        <div style="display:flex; gap:8px; font-size:0.65rem; color:#94a3b8; flex-wrap:wrap; margin-top:2px;">
                            <span><i class="fas fa-folder"></i> ${escapeHtml(folderName)}</span>
                            <span>${formatSize(file.size)}</span>
                            ${timeAgo ? `<span><i class="far fa-clock"></i> ${timeAgo}</span>` : ''}
                        </div>
                    </div>
                    <div style="flex-shrink:0; display:flex; gap:4px;">
                        <button class="recent-download-btn" data-file-id="${file.id}" data-folder="${file.folder}" 
                                style="background:none; border:none; color:#3b82f6; cursor:pointer; padding:4px 6px; border-radius:6px;" title="Ladda ner">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Lägg till händelselyssnare
        document.querySelectorAll('.recent-file-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.recent-download-btn')) return;
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
    }

    // Ladda ner en fil
    function downloadFile(file) {
        if (!file || !file.url) {
            showToast('Kunde inte ladda ner filen', true);
            return;
        }
        try {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.filename;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast(`Laddar ner: ${file.filename}`);
        } catch (error) {
            showToast('Fel vid nedladdning', true);
        }
    }

    // Ladda om listan (anropas när panelen visas)
    function loadRecentFiles() {
        if (recentFilesCache.length > 0) {
            renderRecentFiles(recentFilesCache);
        } else {
            // Försök hämta från Firebase direkt
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
                                        timestamp: new Date(file.date || 0).getTime()
                                    });
                                }
                            });
                        }
                    });
                    allFiles.sort((a, b) => b.timestamp - a.timestamp);
                    recentFilesCache = allFiles.slice(0, 30);
                    renderRecentFiles(recentFilesCache);
                }
            });
        }
    }

    // Hjälpfunktioner för filtyper
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
            'c': 'fa-file-code', 'cpp': 'fa-file-code', 'sql': 'fa-file-code',
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
            'dwg': '#14b8a6', 'dxf': '#14b8a6', 'exe': '#ef4444'
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
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getTimeAgo(timestamp) {
        if (!timestamp) return '';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'just nu';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + ' min sedan';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + ' h sedan';
        const days = Math.floor(hours / 24);
        if (days < 7) return days + ' d sedan';
        return '';
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(msg, isError = false) {
        if (window.showToast) window.showToast(msg, isError);
        else if (window.visaMeddelande) window.visaMeddelande(msg, isError);
        else alert(msg);
    }

    // Exponera funktioner globalt
    window.toggleRecentPanel = toggleRecentPanel;
    window.showRecentFiles = function() { toggleRecentPanel(true); };

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
        // Vänta på att Firebase är redo
        const checkInterval = setInterval(() => {
            if (window.database && document.querySelector('.header-right')) {
                clearInterval(checkInterval);
                createRecentPanel();
                addRecentButton();
                console.log('✅ recent.js initierad');
            }
        }, 300);

        // Fallback
        setTimeout(() => {
            if (!document.getElementById('recentToggleBtn')) {
                createRecentPanel();
                addRecentButton();
            }
        }, 3000);
    });
})();