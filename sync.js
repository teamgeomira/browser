// sync.js - Sincronizador COMPLETO para Delad Mapp Online
// Se integra con index.html - Interfaz de usuario para sincronización
// Comunicación con servidor Node.js (server.js) en http://localhost:3001

(function() {
    'use strict';

    // ============================================================
    //  CONFIGURACIÓN
    // ============================================================

    const SYNC_CONFIG = {
        serverPort: 3001,
        serverUrl: 'http://localhost:3001',
        isRunning: false,
        isServerAvailable: false,
        eventSource: null,
        basePath: 'C:/Users/vinic_flqp90p/Videos/',
        uiElements: {},
        serverCheckInterval: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5
    };

    // ============================================================
    //  FUNCIÓN PARA NORMALIZAR RUTAS LOCALES
    // ============================================================

    function normalizeLocalPath(path) {
        if (!path) return '';
        let cleaned = path.trim().replace(/\\/g, '/');
        cleaned = cleaned.replace(/\/+/g, '/');
        return cleaned;
    }

    // ============================================================
    //  CREAR INTERFAZ DE USUARIO (UI)
    // ============================================================

    function createSyncUI() {
        // Evitar duplicados
        if (document.getElementById('syncPanel')) return;

        // Estilos adicionales para la interfaz
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse-dot {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            .sync-pulse { animation: pulse-dot 1.5s ease-in-out infinite; }
            .sync-spin { animation: spin 2s linear infinite; }
            #syncLogContent::-webkit-scrollbar { width: 4px; }
            #syncLogContent::-webkit-scrollbar-track { background: #0f172a; }
            #syncLogContent::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
            #syncPanel .sync-status-badge {
                font-size: 0.6rem;
                padding: 2px 10px;
                border-radius: 12px;
                font-weight: 400;
            }
        `;
        document.head.appendChild(style);

        // Panel principal
        const syncPanel = document.createElement('div');
        syncPanel.id = 'syncPanel';
        syncPanel.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 460px;
            max-height: 650px;
            background: #1e293b;
            border: 1px solid #475569;
            border-radius: 16px;
            padding: 20px;
            z-index: 9999;
            box-shadow: 0 20px 60px rgba(0,0,0,0.8);
            display: none;
            overflow-y: auto;
            font-family: 'Inter', sans-serif;
            color: #e2e8f0;
            transition: all 0.3s ease;
        `;

        // HTML del panel
        syncPanel.innerHTML = `
            <!-- Cabecera -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="font-size:1rem;font-weight:600;color:#f1f5f9;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-cloud-upload-alt" style="color:#60a5fa;"></i>
                    Sincronización
                    <span id="syncStatusBadge" class="sync-status-badge" style="background:#334155;color:#94a3b8;">OFF</span>
                </h3>
                <div style="display:flex;gap:6px;">
                    <button id="syncMinimizeBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.9rem;transition:all 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button id="syncCloseBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.9rem;transition:all 0.2s;" onmouseover="this.style.background='#7f1d1d'" onmouseout="this.style.background='transparent'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>

            <!-- Estado del servidor -->
            <div id="syncServerStatus" style="background:#0f172a;border-radius:10px;padding:10px 14px;margin-bottom:10px;border:1px solid #334155;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span id="syncServerDot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#64748b;"></span>
                    <span id="syncServerText" style="font-size:0.8rem;color:#94a3b8;">Verificando servidor...</span>
                </div>
                <button id="syncReconnectBtn" style="background:none;border:1px solid #334155;color:#94a3b8;cursor:pointer;padding:4px 10px;border-radius:6px;font-size:0.65rem;transition:all 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                    <i class="fas fa-sync-alt"></i> Reconectar
                </button>
            </div>

            <!-- Estado de sincronización -->
            <div id="syncStatus" style="background:#0f172a;border-radius:10px;padding:10px 14px;margin-bottom:10px;border:1px solid #334155;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span id="syncStatusDot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#64748b;"></span>
                    <span id="syncStatusText" style="font-size:0.8rem;color:#94a3b8;">Inactivo</span>
                </div>
                <div style="font-size:0.7rem;color:#64748b;margin-top:3px;word-break:break-all;" id="syncStatusDetail">Selecciona una carpeta para empezar</div>
            </div>

            <!-- Carpeta LOCAL -->
            <div style="margin-bottom:10px;">
                <label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;">
                    <i class="fas fa-folder"></i> Carpeta local
                </label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="syncFolderPath" placeholder="C:/ruta/a/carpeta" 
                           style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                    <button id="syncBrowseBtn" style="padding:8px 14px;border-radius:10px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                        <i class="fas fa-folder-open"></i>
                    </button>
                </div>
                <div style="font-size:0.6rem;color:#10b981;margin-top:4px;">
                    ✅ La carpeta se creará automáticamente si no existe
                </div>
            </div>

            <!-- Carpeta en la NUBE -->
            <div style="margin-bottom:10px;">
                <label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;">
                    <i class="fas fa-cloud"></i> Carpeta en la nube
                </label>
                <div style="display:flex;gap:8px;">
                    <input type="text" id="syncRemoteFolder" placeholder="nombre_carpeta" 
                           style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                    <button id="syncCheckRemoteBtn" style="padding:8px 14px;border-radius:10px;border:none;background:#8b5cf6;color:white;cursor:pointer;font-size:0.7rem;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#7c3aed'" onmouseout="this.style.background='#8b5cf6'">
                        <i class="fas fa-check"></i> Verificar
                    </button>
                </div>
                <div style="font-size:0.6rem;color:#64748b;margin-top:4px;">
                    💡 Si no existe, se creará automáticamente
                </div>
                <div id="syncRemoteStatus" style="font-size:0.65rem;color:#64748b;margin-top:3px;"></div>
            </div>

            <!-- Botones de control -->
            <div style="display:flex;gap:8px;margin-bottom:10px;">
                <button id="syncStartBtn" style="flex:1;padding:10px;border-radius:10px;border:none;background:#10b981;color:white;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:'Inter',sans-serif;transition:all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                    <i class="fas fa-play"></i> Iniciar
                </button>
                <button id="syncStopBtn" style="flex:1;padding:10px;border-radius:10px;border:none;background:#7f1d1d;color:#fca5a5;cursor:pointer;font-weight:600;font-size:0.85rem;font-family:'Inter',sans-serif;display:none;transition:all 0.2s;" onmouseover="this.style.background='#991b1b'" onmouseout="this.style.background='#7f1d1d'">
                    <i class="fas fa-stop"></i> Detener
                </button>
            </div>

            <!-- Estadísticas -->
            <div id="syncStats" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:0.7rem;color:#94a3b8;margin-bottom:10px;">
                <div style="background:#0f172a;padding:8px 12px;border-radius:8px;text-align:center;border:1px solid #1e293b;">
                    <span style="display:block;color:#64748b;">📁 Archivos</span>
                    <span id="syncFileCount" style="font-size:1.1rem;font-weight:600;color:#f1f5f9;">0</span>
                </div>
                <div style="background:#0f172a;padding:8px 12px;border-radius:8px;text-align:center;border:1px solid #1e293b;">
                    <span style="display:block;color:#64748b;">✅ Sincronizados</span>
                    <span id="syncSyncedCount" style="font-size:1.1rem;font-weight:600;color:#10b981;">0</span>
                </div>
                <div style="background:#0f172a;padding:8px 12px;border-radius:8px;text-align:center;border:1px solid #1e293b;">
                    <span style="display:block;color:#64748b;">⏳ Pendientes</span>
                    <span id="syncPendingCount" style="font-size:1.1rem;font-weight:600;color:#f59e0b;">0</span>
                </div>
            </div>

            <!-- Progreso -->
            <div style="margin-bottom:10px;display:none;" id="syncProgressContainer">
                <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:#94a3b8;margin-bottom:3px;">
                    <span id="syncProgressText">Sincronizando...</span>
                    <span id="syncProgressPercent">0%</span>
                </div>
                <div style="background:#334155;border-radius:10px;height:6px;overflow:hidden;">
                    <div id="syncProgressBar" style="background:linear-gradient(90deg,#3b82f6,#8b5cf6);height:100%;width:0%;transition:width 0.3s ease;"></div>
                </div>
            </div>

            <!-- Última actividad -->
            <div style="font-size:0.65rem;color:#64748b;text-align:center;margin-bottom:8px;" id="syncLastActivity">Última actividad: -</div>

            <!-- Log -->
            <div id="syncLog" style="background:#0f172a;border-radius:8px;padding:8px;max-height:90px;overflow-y:auto;font-size:0.7rem;color:#94a3b8;border:1px solid #1e293b;">
                <div id="syncLogContent"></div>
            </div>

            <!-- Footer -->
            <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:0.55rem;color:#475569;">
                <span>🔄 Sincronización en tiempo real</span>
                <span id="syncVersion">v6.0</span>
            </div>
        `;

        document.body.appendChild(syncPanel);

        // ============================================================
        //  BOTÓN FLOTANTE PARA ABRIR EL PANEL
        // ============================================================

        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'syncToggleBtn';
        toggleBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            z-index: 9998;
            box-shadow: 0 8px 25px rgba(59,130,246,0.4);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        toggleBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        toggleBtn.title = 'Sincronización - Panel de Control';

        toggleBtn.addEventListener('mouseenter', () => {
            toggleBtn.style.transform = 'scale(1.1)';
        });
        toggleBtn.addEventListener('mouseleave', () => {
            toggleBtn.style.transform = 'scale(1)';
        });

        toggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('syncPanel');
            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'block';
                toggleBtn.style.display = 'none';
                checkServerStatus();
            }
        });

        document.body.appendChild(toggleBtn);

        // ============================================================
        //  GUARDAR REFERENCIAS A ELEMENTOS UI
        // ============================================================

        SYNC_CONFIG.uiElements = {
            panel: syncPanel,
            toggleBtn: toggleBtn,
            serverDot: document.getElementById('syncServerDot'),
            serverText: document.getElementById('syncServerText'),
            statusDot: document.getElementById('syncStatusDot'),
            statusText: document.getElementById('syncStatusText'),
            statusDetail: document.getElementById('syncStatusDetail'),
            statusBadge: document.getElementById('syncStatusBadge'),
            folderPath: document.getElementById('syncFolderPath'),
            remoteFolder: document.getElementById('syncRemoteFolder'),
            remoteStatus: document.getElementById('syncRemoteStatus'),
            browseBtn: document.getElementById('syncBrowseBtn'),
            startBtn: document.getElementById('syncStartBtn'),
            stopBtn: document.getElementById('syncStopBtn'),
            reconnectBtn: document.getElementById('syncReconnectBtn'),
            checkRemoteBtn: document.getElementById('syncCheckRemoteBtn'),
            fileCount: document.getElementById('syncFileCount'),
            syncedCount: document.getElementById('syncSyncedCount'),
            pendingCount: document.getElementById('syncPendingCount'),
            progressContainer: document.getElementById('syncProgressContainer'),
            progressBar: document.getElementById('syncProgressBar'),
            progressText: document.getElementById('syncProgressText'),
            progressPercent: document.getElementById('syncProgressPercent'),
            lastActivity: document.getElementById('syncLastActivity'),
            logContent: document.getElementById('syncLogContent'),
            minimizeBtn: document.getElementById('syncMinimizeBtn'),
            closeBtn: document.getElementById('syncCloseBtn'),
            version: document.getElementById('syncVersion')
        };

        // ============================================================
        //  CONFIGURAR EVENTOS UI
        // ============================================================

        setupUIEvents();
        // Verificar servidor periódicamente
        SYNC_CONFIG.serverCheckInterval = setInterval(checkServerStatus, 30000);
        loadSavedConfig();
    }

    // ============================================================
    //  CARGAR CONFIGURACIÓN GUARDADA
    // ============================================================

    function loadSavedConfig() {
        const ui = SYNC_CONFIG.uiElements;
        const savedLocal = localStorage.getItem('syncLocalFolder');
        const savedRemote = localStorage.getItem('syncRemoteFolder');
        if (savedLocal) {
            ui.folderPath.value = savedLocal;
            updateStatus('ready', `Carpeta local: ${savedLocal}`);
        }
        if (savedRemote) {
            ui.remoteFolder.value = savedRemote;
            ui.remoteStatus.textContent = `📂 Carpeta remota: ${savedRemote}`;
            ui.remoteStatus.style.color = '#60a5fa';
        }
        if (savedLocal && !savedRemote) {
            const name = savedLocal.split('/').pop().toLowerCase().replace(/\s+/g, '_');
            ui.remoteFolder.value = name;
            ui.remoteStatus.textContent = `📂 Carpeta remota sugerida: ${name}`;
            ui.remoteStatus.style.color = '#94a3b8';
        }
    }

    // ============================================================
    //  CONFIGURAR EVENTOS UI
    // ============================================================

    function setupUIEvents() {
        const ui = SYNC_CONFIG.uiElements;

        // Minimizar / Cerrar
        ui.minimizeBtn.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.toggleBtn.style.display = 'flex';
        });
        ui.closeBtn.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.toggleBtn.style.display = 'flex';
        });

        // Reconectar servidor
        ui.reconnectBtn.addEventListener('click', () => {
            checkServerStatus();
        });

        // Verificar carpeta remota
        ui.checkRemoteBtn.addEventListener('click', async () => {
            const remote = ui.remoteFolder.value.trim();
            if (!remote) {
                ui.remoteStatus.textContent = '⚠️ Escribe un nombre para la carpeta remota';
                ui.remoteStatus.style.color = '#f59e0b';
                return;
            }
            if (!remote.match(/^[a-zA-Z0-9_\-]+$/)) {
                ui.remoteStatus.textContent = '❌ Solo letras, números, guiones y guión bajo';
                ui.remoteStatus.style.color = '#ef4444';
                return;
            }
            try {
                const response = await fetch(`${SYNC_CONFIG.serverUrl}/api/sync/check-remote-folder`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ remoteFolder: remote })
                });
                const data = await response.json();
                if (data.exists) {
                    ui.remoteStatus.textContent = `✅ La carpeta "${remote}" ya existe en la nube`;
                    ui.remoteStatus.style.color = '#10b981';
                } else {
                    ui.remoteStatus.textContent = `📁 La carpeta "${remote}" se creará al iniciar`;
                    ui.remoteStatus.style.color = '#60a5fa';
                }
            } catch (error) {
                ui.remoteStatus.textContent = `❌ Error al verificar: ${error.message}`;
                ui.remoteStatus.style.color = '#ef4444';
            }
        });

        // Seleccionar carpeta local
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
                        fullPath = SYNC_CONFIG.basePath + fullPath;
                    }
                    fullPath = normalizeLocalPath(fullPath);
                    ui.folderPath.value = fullPath;
                    localStorage.setItem('syncLocalFolder', fullPath);
                    const remoteName = fullPath.split('/').pop().toLowerCase().replace(/\s+/g, '_');
                    if (!ui.remoteFolder.value) {
                        ui.remoteFolder.value = remoteName;
                        ui.remoteStatus.textContent = `📂 Carpeta remota sugerida: ${remoteName}`;
                        ui.remoteStatus.style.color = '#94a3b8';
                    }
                    updateStatus('ready', `Carpeta local: ${fullPath}`);
                    addLog(`📁 Carpeta local seleccionada: ${fullPath}`, 'success');
                }).catch(() => {});
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.directory = true;
                input.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        let path = e.target.files[0].webkitRelativePath.split('/')[0];
                        let fullPath = SYNC_CONFIG.basePath + path;
                        fullPath = normalizeLocalPath(fullPath);
                        ui.folderPath.value = fullPath;
                        localStorage.setItem('syncLocalFolder', fullPath);
                        const remoteName = path.toLowerCase().replace(/\s+/g, '_');
                        if (!ui.remoteFolder.value) {
                            ui.remoteFolder.value = remoteName;
                            ui.remoteStatus.textContent = `📂 Carpeta remota sugerida: ${remoteName}`;
                            ui.remoteStatus.style.color = '#94a3b8';
                        }
                        updateStatus('ready', `Carpeta local: ${fullPath}`);
                        addLog(`📁 Carpeta local seleccionada: ${fullPath}`, 'success');
                    }
                };
                input.click();
            }
        });

        // ============================================================
        //  BOTÓN INICIAR
        // ============================================================

        ui.startBtn.addEventListener('click', async () => {
            let local = ui.folderPath.value.trim();
            const remote = ui.remoteFolder.value.trim();

            if (!local) {
                addLog('⚠️ Selecciona una carpeta local primero', 'warning');
                updateStatus('error', 'Selecciona una carpeta local');
                return;
            }
            if (!remote) {
                addLog('⚠️ Escribe un nombre para la carpeta en la nube', 'warning');
                updateStatus('error', 'Nombre de carpeta remota requerido');
                return;
            }
            if (!remote.match(/^[a-zA-Z0-9_\-]+$/)) {
                addLog('❌ Nombre de carpeta remota inválido', 'error');
                return;
            }

            local = normalizeLocalPath(local);
            ui.folderPath.value = local;
            await startSync(local, remote);
        });

        // Botón Detener
        ui.stopBtn.addEventListener('click', stopSync);

        // Enter en campos de texto
        ui.folderPath.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ui.startBtn.click();
        });
        ui.remoteFolder.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') ui.startBtn.click();
        });
    }

    // ============================================================
    //  VERIFICAR SERVIDOR
    // ============================================================

    async function checkServerStatus() {
        const ui = SYNC_CONFIG.uiElements;
        try {
            const response = await fetch(`${SYNC_CONFIG.serverUrl}/api/sync/status`);
            if (response.ok) {
                const data = await response.json();
                ui.serverDot.style.background = '#10b981';
                ui.serverText.textContent = '✅ Servidor conectado';
                ui.serverText.style.color = '#6ee7b7';
                ui.serverDot.className = '';
                SYNC_CONFIG.isServerAvailable = true;
                SYNC_CONFIG.reconnectAttempts = 0;

                if (data.running) {
                    updateStatus('running', `Sincronizando: ${data.localFolder}`);
                    ui.folderPath.value = data.localFolder;
                    ui.remoteFolder.value = data.remoteFolder;
                    ui.startBtn.style.display = 'none';
                    ui.stopBtn.style.display = 'block';
                } else {
                    ui.startBtn.style.display = 'block';
                    ui.stopBtn.style.display = 'none';
                }

                if (!SYNC_CONFIG.eventSource) {
                    connectToEvents();
                }
                return true;
            }
        } catch (error) {
            ui.serverDot.style.background = '#ef4444';
            ui.serverText.textContent = '❌ Servidor no disponible';
            ui.serverText.style.color = '#fca5a5';
            ui.serverDot.className = 'sync-pulse';
            SYNC_CONFIG.isServerAvailable = false;
            if (SYNC_CONFIG.reconnectAttempts === 0) {
                addLog('⚠️ Servidor no disponible. Ejecuta: node server.js', 'error');
            }
            SYNC_CONFIG.reconnectAttempts++;
            return false;
        }
        return false;
    }

    // ============================================================
    //  CONECTAR A EVENTOS (SSE)
    // ============================================================

    function connectToEvents() {
        if (SYNC_CONFIG.eventSource) {
            SYNC_CONFIG.eventSource.close();
        }
        try {
            const eventSource = new EventSource(`${SYNC_CONFIG.serverUrl}/api/sync/events`);
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleSyncEvent(data);
                } catch (e) {}
            };
            eventSource.onerror = () => {
                // Intentar reconectar después de 5 segundos
                setTimeout(() => {
                    if (SYNC_CONFIG.isServerAvailable) {
                        connectToEvents();
                    }
                }, 5000);
            };
            SYNC_CONFIG.eventSource = eventSource;
            addLog('📡 Conectado a eventos en tiempo real', 'info');
        } catch (error) {
            addLog('⚠️ Error al conectar a eventos', 'warning');
        }
    }

    // ============================================================
    //  ESTADO Y LOGGING
    // ============================================================

    function updateStatus(status, message) {
        const ui = SYNC_CONFIG.uiElements;
        const dotColors = {
            idle: '#64748b',
            ready: '#60a5fa',
            running: '#10b981',
            syncing: '#f59e0b',
            error: '#ef4444'
        };
        const statusTexts = {
            idle: 'Inactivo',
            ready: 'Listo',
            running: 'Ejecutando',
            syncing: 'Sincronizando',
            error: 'Error'
        };
        const badgeColors = {
            idle: '#334155',
            ready: '#3b82f6',
            running: '#10b981',
            syncing: '#f59e0b',
            error: '#ef4444'
        };
        ui.statusDot.style.background = dotColors[status] || '#64748b';
        ui.statusText.textContent = statusTexts[status] || message;
        ui.statusDetail.textContent = message || '';
        ui.statusBadge.textContent = statusTexts[status]?.toUpperCase() || 'OFF';
        ui.statusBadge.style.background = badgeColors[status] || '#334155';
        ui.statusBadge.style.color = status === 'idle' ? '#94a3b8' : 'white';
    }

    function addLog(message, type = 'info') {
        const ui = SYNC_CONFIG.uiElements;
        const timestamp = new Date().toLocaleTimeString('sv-SE');
        const colors = {
            info: '#94a3b8',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        };
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            padding: 2px 0;
            border-bottom: 1px solid #1e293b;
            color: ${colors[type] || colors.info};
            font-size: 0.7rem;
        `;
        logEntry.textContent = `[${timestamp}] ${message}`;
        ui.logContent.appendChild(logEntry);
        ui.logContent.scrollTop = ui.logContent.scrollHeight;
        while (ui.logContent.children.length > 100) {
            ui.logContent.removeChild(ui.logContent.firstChild);
        }
        ui.lastActivity.textContent = `Última actividad: ${timestamp}`;
    }

    function updateProgress(percent, text = 'Sincronizando...') {
        const ui = SYNC_CONFIG.uiElements;
        ui.progressContainer.style.display = 'block';
        ui.progressBar.style.width = percent + '%';
        ui.progressPercent.textContent = percent + '%';
        ui.progressText.textContent = text;
        if (percent >= 100) {
            setTimeout(() => {
                ui.progressContainer.style.display = 'none';
                ui.progressBar.style.width = '0%';
            }, 2000);
        }
    }

    // ============================================================
    //  FUNCIONES PRINCIPALES
    // ============================================================

    async function startSync(localFolder, remoteFolder) {
        try {
            if (!localFolder) {
                addLog('❌ Error: Carpeta local no especificada', 'error');
                updateStatus('error', 'Carpeta local no especificada');
                return;
            }
            if (!remoteFolder) {
                addLog('❌ Error: Carpeta remota no especificada', 'error');
                updateStatus('error', 'Carpeta remota no especificada');
                return;
            }
            if (SYNC_CONFIG.isRunning) {
                addLog('⚠️ La sincronización ya está en ejecución', 'warning');
                return;
            }
            if (!SYNC_CONFIG.isServerAvailable) {
                const available = await checkServerStatus();
                if (!available) {
                    addLog('❌ Servidor no disponible', 'error');
                    return;
                }
            }

            localStorage.setItem('syncLocalFolder', localFolder);
            localStorage.setItem('syncRemoteFolder', remoteFolder);

            addLog(`🚀 Iniciando sincronización: ${localFolder} → ${remoteFolder}`, 'info');
            updateStatus('running', `Conectando...`);
            updateProgress(10, 'Iniciando sincronización...');

            const response = await fetch(`${SYNC_CONFIG.serverUrl}/api/sync/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ localFolder, remoteFolder })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || error.message || 'Error al iniciar');
            }

            const data = await response.json();
            SYNC_CONFIG.isRunning = true;

            const ui = SYNC_CONFIG.uiElements;
            ui.startBtn.style.display = 'none';
            ui.stopBtn.style.display = 'block';
            updateStatus('running', `Sincronizando: ${localFolder} → ${remoteFolder}`);
            updateProgress(100, '¡Sincronización iniciada!');

            addLog(`✅ Sincronización iniciada correctamente`, 'success');
            addLog(`📁 Local: ${data.localFolder}`, 'info');
            addLog(`☁️ Nube: ${data.remoteFolder}`, 'info');
            if (data.created) {
                addLog(`📁 La carpeta fue creada automáticamente`, 'success');
            }
            if (data.files) {
                addLog(`📁 ${data.files} archivos encontrados`, 'info');
                ui.fileCount.textContent = data.files;
            }
            if (!SYNC_CONFIG.eventSource) {
                connectToEvents();
            }
        } catch (error) {
            addLog(`❌ Error: ${error.message}`, 'error');
            updateStatus('error', `Error: ${error.message}`);
            SYNC_CONFIG.isRunning = false;
            updateProgress(0, 'Error');
            const ui = SYNC_CONFIG.uiElements;
            ui.startBtn.style.display = 'block';
            ui.stopBtn.style.display = 'none';
        }
    }

    function stopSync() {
        if (!SYNC_CONFIG.isRunning) {
            addLog('⚠️ La sincronización ya está detenida', 'warning');
            return;
        }
        addLog('⏹️ Deteniendo sincronización...', 'warning');
        updateStatus('idle', 'Deteniendo...');
        updateProgress(50, 'Deteniendo...');
        fetch(`${SYNC_CONFIG.serverUrl}/api/sync/stop`, { method: 'POST' })
            .then(() => {
                SYNC_CONFIG.isRunning = false;
                const ui = SYNC_CONFIG.uiElements;
                ui.startBtn.style.display = 'block';
                ui.stopBtn.style.display = 'none';
                updateStatus('idle', 'Sincronización detenida');
                updateProgress(100, 'Detenido');
                addLog('✅ Sincronización detenida', 'success');
            })
            .catch(err => {
                addLog(`⚠️ Error al detener: ${err.message}`, 'warning');
            });
    }

    // ============================================================
    //  MANEJAR EVENTOS DE SINCRONIZACIÓN
    // ============================================================

    function handleSyncEvent(data) {
        const ui = SYNC_CONFIG.uiElements;
        switch (data.event) {
            case 'file_added':
                addLog(`📄 Archivo añadido: ${data.filename}`, 'success');
                break;
            case 'file_changed':
                addLog(`✏️ Archivo modificado: ${data.filename}`, 'info');
                break;
            case 'file_deleted':
                addLog(`🗑️ Archivo eliminado: ${data.filename}`, 'warning');
                break;
            case 'folder_added':
                addLog(`📁 Carpeta creada: ${data.foldername}`, 'info');
                break;
            case 'folder_deleted':
                addLog(`🗑️ Carpeta eliminada: ${data.foldername}`, 'warning');
                break;
            case 'sync_complete':
                addLog(`✅ Sincronización completada`, 'success');
                updateStatus('running', 'Sincronizado');
                break;
            case 'sync_error':
                addLog(`❌ ${data.message}`, 'error');
                updateStatus('error', data.message);
                break;
            default:
                addLog(`ℹ️ ${data.message || 'Evento'}`, 'info');
        }
        if (data.stats) {
            ui.fileCount.textContent = data.stats.total || '0';
            ui.syncedCount.textContent = data.stats.synced || '0';
            ui.pendingCount.textContent = data.stats.pending || '0';
        }
    }

    // ============================================================
    //  INICIALIZACIÓN
    // ============================================================

    function initSync() {
        console.log('🔄 Inicializando sincronizador v6.0...');
        const checkIcons = setInterval(() => {
            if (document.querySelector('link[href*="font-awesome"]') ||
                document.querySelector('script[src*="font-awesome"]')) {
                clearInterval(checkIcons);
                createSyncUI();
                addLog('👋 ¡Bienvenido! La carpeta se creará automáticamente', 'info');
                setTimeout(checkServerStatus, 1500);
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkIcons);
            if (!document.getElementById('syncPanel')) {
                createSyncUI();
                addLog('👋 ¡Bienvenido! La carpeta se creará automáticamente', 'info');
                setTimeout(checkServerStatus, 1500);
            }
        }, 3000);
        console.log('✅ Sincronizador v6.0 inicializado');
    }

    // ============================================================
    //  EXPORTAR FUNCIONES (para usar desde consola)
    // ============================================================

    window.SyncManager = {
        init: initSync,
        start: startSync,
        stop: stopSync,
        getStatus: () => SYNC_CONFIG.isRunning,
        addLog: addLog,
        reconnect: checkServerStatus
    };

    // ============================================================
    //  AUTO-INICIAR
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        setTimeout(initSync, 500);
    }
    console.log('📦 sync.js v6.0 cargado correctamente');

})();
