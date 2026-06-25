// sync-manager.js - Gestor de Múltiples Carpetas de Sincronización
// Se integra con index.html - Permite agregar/eliminar carpetas locales
// SIN rutas fijas - Cada usuario elige sus propias carpetas

(function() {
    'use strict';

    // ============================================================
    //  CONFIGURACIÓN GLOBAL
    // ============================================================

    const MANAGER_CONFIG = {
        serverUrl: 'http://localhost:3001',
        syncFolders: [], // Array de { id, localPath, remoteName, status, files }
        isRunning: false,
        uiElements: {},
        eventSource: null
    };

    // ============================================================
    //  CREAR INTERFAZ DEL GESTOR DE CARPETAS
    // ============================================================

    function createFolderManagerUI() {
        if (document.getElementById('folderManagerPanel')) return;

        // Panel del gestor de carpetas
        const managerPanel = document.createElement('div');
        managerPanel.id = 'folderManagerPanel';
        managerPanel.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 20px;
            width: 480px;
            max-height: 550px;
            background: #1e293b;
            border: 1px solid #475569;
            border-radius: 16px;
            padding: 20px;
            z-index: 9998;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            display: none;
            overflow-y: auto;
            font-family: 'Inter', sans-serif;
            color: #e2e8f0;
            transition: all 0.3s ease;
        `;

        managerPanel.innerHTML = `
            <!-- Cabecera -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="font-size:1rem;font-weight:600;color:#f1f5f9;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-folder-tree" style="color:#60a5fa;"></i>
                    Gestor de Carpetas
                    <span id="folderCountBadge" style="font-size:0.6rem;padding:2px 10px;border-radius:12px;background:#334155;color:#94a3b8;">0</span>
                </h3>
                <button id="closeManagerBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.9rem;" onmouseover="this.style.background='#7f1d1d'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Lista de carpetas -->
            <div id="foldersList" style="max-height:300px;overflow-y:auto;margin-bottom:12px;">
                <div style="text-align:center;color:#64748b;padding:20px;font-size:0.85rem;">
                    <i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    No hay carpetas agregadas
                </div>
            </div>

            <!-- Formulario para agregar carpeta -->
            <div style="border-top:1px solid #334155;padding-top:12px;">
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <input type="text" id="newLocalPath" placeholder="C:/ruta/a/carpeta" 
                           style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                    <button id="browseLocalBtn" style="padding:8px 14px;border-radius:10px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:0.85rem;font-weight:600;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        <i class="fas fa-folder-open"></i>
                    </button>
                </div>
                <div style="display:flex;gap:8px;margin-bottom:8px;">
                    <input type="text" id="newRemoteName" placeholder="nombre_en_nube" 
                           style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                </div>
                <button id="addFolderBtn" style="width:100%;padding:10px;border-radius:10px;border:none;background:#10b981;color:white;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:'Inter',sans-serif;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fas fa-plus"></i> Agregar Carpeta
                </button>
            </div>

            <!-- Botones de acción -->
            <div style="display:flex;gap:8px;margin-top:12px;border-top:1px solid #334155;padding-top:12px;">
                <button id="syncAllBtn" style="flex:1;padding:10px;border-radius:10px;border:none;background:#8b5cf6;color:white;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:'Inter',sans-serif;" onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
                    <i class="fas fa-play"></i> Sincronizar Todas
                </button>
                <button id="stopAllBtn" style="flex:1;padding:10px;border-radius:10px;border:none;background:#7f1d1d;color:#fca5a5;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:'Inter',sans-serif;display:none;" onmouseover="this.style.background='#991b1b'" onmouseout="this.style.background='#7f1d1d'">
                    <i class="fas fa-stop"></i> Detener Todas
                </button>
            </div>
        `;

        document.body.appendChild(managerPanel);

        // Botón para abrir el gestor (junto al botón de sincronización)
        const managerToggleBtn = document.createElement('button');
        managerToggleBtn.id = 'managerToggleBtn';
        managerToggleBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #8b5cf6, #3b82f6);
            color: white;
            font-size: 1.2rem;
            cursor: pointer;
            z-index: 9997;
            box-shadow: 0 8px 25px rgba(139,92,246,0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        managerToggleBtn.innerHTML = '<i class="fas fa-folder-tree"></i>';
        managerToggleBtn.title = 'Gestor de Carpetas';

        managerToggleBtn.addEventListener('mouseenter', () => {
            managerToggleBtn.style.transform = 'scale(1.1)';
        });
        managerToggleBtn.addEventListener('mouseleave', () => {
            managerToggleBtn.style.transform = 'scale(1)';
        });

        managerToggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('folderManagerPanel');
            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'block';
                managerToggleBtn.style.display = 'none';
                loadSavedFolders();
            }
        });

        document.body.appendChild(managerToggleBtn);

        // Guardar referencias
        MANAGER_CONFIG.uiElements = {
            panel: managerPanel,
            toggleBtn: managerToggleBtn,
            foldersList: document.getElementById('foldersList'),
            folderCountBadge: document.getElementById('folderCountBadge'),
            newLocalPath: document.getElementById('newLocalPath'),
            newRemoteName: document.getElementById('newRemoteName'),
            browseBtn: document.getElementById('browseLocalBtn'),
            addBtn: document.getElementById('addFolderBtn'),
            syncAllBtn: document.getElementById('syncAllBtn'),
            stopAllBtn: document.getElementById('stopAllBtn'),
            closeBtn: document.getElementById('closeManagerBtn')
        };

        // Configurar eventos
        setupManagerEvents();
        loadSavedFolders();
    }

    // ============================================================
    //  CARGAR CARPETAS GUARDADAS
    // ============================================================

    function loadSavedFolders() {
        try {
            const saved = localStorage.getItem('syncFolders');
            if (saved) {
                MANAGER_CONFIG.syncFolders = JSON.parse(saved);
                renderFoldersList();
            }
        } catch (e) {
            console.error('Error cargando carpetas:', e);
        }
    }

    // ============================================================
    //  GUARDAR CARPETAS
    // ============================================================

    function saveFolders() {
        try {
            localStorage.setItem('syncFolders', JSON.stringify(MANAGER_CONFIG.syncFolders));
            renderFoldersList();
        } catch (e) {
            console.error('Error guardando carpetas:', e);
        }
    }

    // ============================================================
    //  RENDERIZAR LISTA DE CARPETAS
    // ============================================================

    function renderFoldersList() {
        const ui = MANAGER_CONFIG.uiElements;
        const folders = MANAGER_CONFIG.syncFolders;

        ui.folderCountBadge.textContent = folders.length;

        if (folders.length === 0) {
            ui.foldersList.innerHTML = `
                <div style="text-align:center;color:#64748b;padding:20px;font-size:0.85rem;">
                    <i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    No hay carpetas agregadas
                    <br><small style="color:#475569;">Agrega una carpeta para comenzar</small>
                </div>
            `;
            return;
        }

        ui.foldersList.innerHTML = folders.map((folder, index) => `
            <div style="background:#0f172a;border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid #1e293b;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div style="flex:1;overflow:hidden;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <i class="fas fa-folder" style="color:#f59e0b;"></i>
                            <span style="font-weight:500;font-size:0.85rem;color:#f1f5f9;word-break:break-all;">${escapeHtml(folder.localPath)}</span>
                        </div>
                        <div style="font-size:0.7rem;color:#94a3b8;margin-top:3px;">
                            ☁️ ${escapeHtml(folder.remoteName)} 
                            <span style="color:${folder.status === 'syncing' ? '#10b981' : folder.status === 'error' ? '#ef4444' : '#64748b'};">
                                • ${folder.status || 'inactivo'}
                            </span>
                            ${folder.files ? `• 📁 ${folder.files} archivos` : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:4px;flex-shrink:0;">
                        <button class="sync-folder-btn" data-index="${index}" style="background:none;border:none;color:#10b981;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.75rem;" title="Sincronizar">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="stop-folder-btn" data-index="${index}" style="background:none;border:none;color:#fca5a5;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.75rem;display:${folder.status === 'syncing' ? 'inline' : 'none'};" title="Detener">
                            <i class="fas fa-stop"></i>
                        </button>
                        <button class="remove-folder-btn" data-index="${index}" style="background:none;border:none;color:#64748b;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.75rem;" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${folder.status === 'syncing' ? `
                    <div style="margin-top:6px;background:#334155;border-radius:10px;height:4px;overflow:hidden;">
                        <div style="background:linear-gradient(90deg,#3b82f6,#8b5cf6);height:100%;width:${folder.progress || 0}%;transition:width 0.3s ease;"></div>
                    </div>
                    <div style="font-size:0.6rem;color:#64748b;margin-top:3px;text-align:right;">${folder.progress || 0}%</div>
                ` : ''}
            </div>
        `).join('');

        // Eventos para los botones de cada carpeta
        document.querySelectorAll('.sync-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                startFolderSync(index);
            });
        });

        document.querySelectorAll('.stop-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                stopFolderSync(index);
            });
        });

        document.querySelectorAll('.remove-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                if (confirm(`¿Eliminar la carpeta "${MANAGER_CONFIG.syncFolders[index].localPath}"?`)) {
                    MANAGER_CONFIG.syncFolders.splice(index, 1);
                    saveFolders();
                }
            });
        });
    }

    // ============================================================
    //  FUNCIONES DE SINCRONIZACIÓN POR CARPETA
    // ============================================================

    async function startFolderSync(index) {
        const folder = MANAGER_CONFIG.syncFolders[index];
        if (!folder) return;

        try {
            folder.status = 'syncing';
            folder.progress = 0;
            saveFolders();

            // Verificar servidor
            const statusResponse = await fetch(`${MANAGER_CONFIG.serverUrl}/api/sync/status`);
            if (!statusResponse.ok) {
                throw new Error('Servidor no disponible');
            }

            // Iniciar sincronización
            const response = await fetch(`${MANAGER_CONFIG.serverUrl}/api/sync/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    localFolder: folder.localPath,
                    remoteFolder: folder.remoteName
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Error al iniciar');
            }

            folder.files = data.files || 0;
            folder.status = 'syncing';
            saveFolders();

            // Conectar a eventos para esta carpeta
            connectToFolderEvents(index);

        } catch (error) {
            folder.status = 'error';
            folder.error = error.message;
            saveFolders();
            showToast(`Error: ${error.message}`, 'error');
        }
    }

    function stopFolderSync(index) {
        const folder = MANAGER_CONFIG.syncFolders[index];
        if (!folder) return;

        fetch(`${MANAGER_CONFIG.serverUrl}/api/sync/stop`, { method: 'POST' })
            .then(() => {
                folder.status = 'stopped';
                saveFolders();
                showToast(`Sincronización detenida: ${folder.remoteName}`, 'info');
            })
            .catch(err => {
                showToast(`Error al detener: ${err.message}`, 'error');
            });
    }

    // ============================================================
    //  CONECTAR A EVENTOS DE UNA CARPETA
    // ============================================================

    function connectToFolderEvents(index) {
        const folder = MANAGER_CONFIG.syncFolders[index];
        if (!folder) return;

        // Usar EventSource para eventos en tiempo real
        try {
            const eventSource = new EventSource(`${MANAGER_CONFIG.serverUrl}/api/sync/events`);
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.folder === folder.remoteName) {
                        folder.progress = data.progress || folder.progress || 0;
                        folder.files = data.total || folder.files || 0;
                        if (data.event === 'sync_complete') {
                            folder.status = 'completed';
                        }
                        saveFolders();
                    }
                } catch (e) {}
            };

            eventSource.onerror = () => {
                setTimeout(() => connectToFolderEvents(index), 5000);
            };

            MANAGER_CONFIG.eventSource = eventSource;
        } catch (error) {
            console.error('Error conectando a eventos:', error);
        }
    }

    // ============================================================
    //  AGREGAR NUEVA CARPETA
    // ============================================================

    function addNewFolder() {
        const ui = MANAGER_CONFIG.uiElements;
        const localPath = ui.newLocalPath.value.trim();
        const remoteName = ui.newRemoteName.value.trim();

        if (!localPath) {
            showToast('⚠️ Ingresa la ruta de la carpeta local', 'warning');
            return;
        }

        if (!remoteName) {
            showToast('⚠️ Ingresa un nombre para la carpeta en la nube', 'warning');
            return;
        }

        // Verificar que no exista
        const exists = MANAGER_CONFIG.syncFolders.some(f => 
            f.localPath === localPath || f.remoteName === remoteName
        );

        if (exists) {
            showToast('⚠️ Esta carpeta ya está agregada', 'warning');
            return;
        }

        // Agregar carpeta
        MANAGER_CONFIG.syncFolders.push({
            id: generateValidId(),
            localPath: localPath,
            remoteName: remoteName,
            status: 'idle',
            files: 0,
            progress: 0,
            addedAt: new Date().toISOString()
        });

        // Limpiar campos
        ui.newLocalPath.value = '';
        ui.newRemoteName.value = '';

        // Guardar y renderizar
        saveFolders();
        showToast(`✅ Carpeta agregada: ${localPath} → ${remoteName}`, 'success');
    }

    // ============================================================
    //  SINCRONIZAR TODAS LAS CARPETAS
    // ============================================================

    async function syncAllFolders() {
        const ui = MANAGER_CONFIG.uiElements;
        ui.syncAllBtn.style.display = 'none';
        ui.stopAllBtn.style.display = 'block';

        for (let i = 0; i < MANAGER_CONFIG.syncFolders.length; i++) {
            const folder = MANAGER_CONFIG.syncFolders[i];
            if (folder.status !== 'syncing' && folder.status !== 'completed') {
                await startFolderSync(i);
                // Esperar un poco entre carpetas
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        ui.syncAllBtn.style.display = 'block';
        ui.stopAllBtn.style.display = 'none';
    }

    function stopAllFolders() {
        MANAGER_CONFIG.syncFolders.forEach((folder, index) => {
            if (folder.status === 'syncing') {
                stopFolderSync(index);
            }
        });
        const ui = MANAGER_CONFIG.uiElements;
        ui.syncAllBtn.style.display = 'block';
        ui.stopAllBtn.style.display = 'none';
    }

    // ============================================================
    //  EVENTOS DEL GESTOR
    // ============================================================

    function setupManagerEvents() {
        const ui = MANAGER_CONFIG.uiElements;

        ui.closeBtn.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.toggleBtn.style.display = 'flex';
        });

        ui.browseBtn.addEventListener('click', () => {
            if (window.showDirectoryPicker) {
                window.showDirectoryPicker().then(async (dirHandle) => {
                    let fullPath = dirHandle.name;
                    try {
                        if (dirHandle.getFile) {
                            const file = await dirHandle.getFile();
                            if (file && file.path) {
                                fullPath = file.path;
                            }
                        }
                    } catch (e) {}
                    if (!fullPath.includes(':') && !fullPath.startsWith('/') && !fullPath.startsWith('\\')) {
                        fullPath = 'C:/' + fullPath;
                    }
                    ui.newLocalPath.value = fullPath;
                    // Autocompletar nombre remoto
                    const remoteName = fullPath.split('/').pop().toLowerCase().replace(/\s+/g, '_');
                    if (!ui.newRemoteName.value) {
                        ui.newRemoteName.value = remoteName;
                    }
                }).catch(() => {});
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.directory = true;
                input.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        const path = e.target.files[0].webkitRelativePath.split('/')[0];
                        const fullPath = 'C:/' + path;
                        ui.newLocalPath.value = fullPath;
                        const remoteName = path.toLowerCase().replace(/\s+/g, '_');
                        if (!ui.newRemoteName.value) {
                            ui.newRemoteName.value = remoteName;
                        }
                    }
                };
                input.click();
            }
        });

        ui.addBtn.addEventListener('click', addNewFolder);

        // Enter en los campos
        ui.newLocalPath.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ui.addBtn.click();
        });
        ui.newRemoteName.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ui.addBtn.click();
        });

        ui.syncAllBtn.addEventListener('click', syncAllFolders);
        ui.stopAllBtn.addEventListener('click', stopAllFolders);

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && ui.panel.style.display === 'block') {
                ui.panel.style.display = 'none';
                ui.toggleBtn.style.display = 'flex';
            }
        });
    }

    // ============================================================
    //  FUNCIONES DE UTILIDAD
    // ============================================================

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function generateValidId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    }

    function showToast(msg, isError = false) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = msg;
            toast.className = 'toast show' + (isError ? ' error' : '');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.className = 'toast';
            }, 3500);
        }
    }

    // ============================================================
    //  INICIALIZACIÓN
    // ============================================================

    function initManager() {
        console.log('📂 Inicializando Gestor de Carpetas...');
        const checkIcons = setInterval(() => {
            if (document.querySelector('link[href*="font-awesome"]') ||
                document.querySelector('script[src*="font-awesome"]')) {
                clearInterval(checkIcons);
                createFolderManagerUI();
                console.log('✅ Gestor de Carpetas listo');
            }
        }, 100);

        setTimeout(() => {
            clearInterval(checkIcons);
            if (!document.getElementById('folderManagerPanel')) {
                createFolderManagerUI();
                console.log('✅ Gestor de Carpetas listo (fallback)');
            }
        }, 3000);
    }

    // ============================================================
    //  EXPORTAR
    // ============================================================

    window.FolderManager = {
        init: initManager,
        addFolder: addNewFolder,
        syncAll: syncAllFolders,
        stopAll: stopAllFolders,
        getFolders: () => MANAGER_CONFIG.syncFolders
    };

    // ============================================================
    //  AUTO-INICIAR
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initManager);
    } else {
        setTimeout(initManager, 500);
    }

    console.log('📦 sync-manager.js cargado correctamente');
})();