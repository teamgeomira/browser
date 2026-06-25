// sync.js - Sincronizador COMPLETO (UNA SOLA PESTAÑA)
// Gestor de carpetas con sincronización - Progreso en tiempo real

(function() {
    'use strict';

    // ============================================================
    //  CONFIGURACIÓN GLOBAL
    // ============================================================

    const SYNC_CONFIG = {
        serverPort: 3001,
        serverUrl: 'http://localhost:3001',
        isRunning: false,
        isServerAvailable: false,
        eventSource: null,
        uiElements: {},
        serverCheckInterval: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        syncFolders: [], // Array de carpetas: { id, localPath, remoteName, status, files, progress, synced }
        folderProgress: {} // Estado en tiempo real de cada carpeta
    };

    // ============================================================
    //  FUNCIONES DE UTILIDAD
    // ============================================================

    function normalizeLocalPath(path) {
        if (!path) return '';
        let cleaned = path.trim().replace(/\\/g, '/');
        cleaned = cleaned.replace(/\/+/g, '/');
        return cleaned;
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function generateValidId() {
        return Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    }

    function getStatusIcon(status) {
        switch(status) {
            case 'syncing': return '🔄';
            case 'completed': return '✅';
            case 'error': return '❌';
            case 'stopped': return '⏹️';
            default: return '⏸️';
        }
    }

    function getStatusText(status) {
        switch(status) {
            case 'syncing': return 'Sincronizando';
            case 'completed': return 'Sincronizado';
            case 'error': return 'Error';
            case 'stopped': return 'Detenido';
            default: return 'Inactivo';
        }
    }

    function getStatusColor(status) {
        switch(status) {
            case 'syncing': return '#f59e0b';
            case 'completed': return '#10b981';
            case 'error': return '#ef4444';
            case 'stopped': return '#f59e0b';
            default: return '#64748b';
        }
    }

    function getStatusClass(status) {
        switch(status) {
            case 'syncing': return 'status-syncing';
            case 'completed': return 'status-completed';
            case 'error': return 'status-error';
            case 'stopped': return 'status-stopped';
            default: return 'status-idle';
        }
    }

    // ============================================================
    //  CREAR INTERFAZ COMPLETA (UNA SOLA PESTAÑA)
    // ============================================================

    function createSyncUI() {
        if (document.getElementById('syncPanel')) return;

        // Estilos
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .sync-pulse { animation: pulse-dot 1.5s ease-in-out infinite; }
            .sync-spin { animation: spin 2s linear infinite; }
            .sync-fade-in { animation: fadeIn 0.3s ease; }
            #syncLogContent::-webkit-scrollbar { width: 4px; }
            #syncLogContent::-webkit-scrollbar-track { background: #0f172a; }
            #syncLogContent::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 4px; }
            
            .folder-item {
                transition: all 0.3s ease;
                border-left: 4px solid #334155;
                background: #0f172a;
                border-radius: 10px;
                padding: 12px;
                border: 1px solid #1e293b;
                margin-bottom: 6px;
            }
            .folder-item.status-syncing { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }
            .folder-item.status-completed { border-left-color: #10b981; background: rgba(16, 185, 129, 0.1); }
            .folder-item.status-completed .folder-name { color: #10b981; }
            .folder-item.status-completed .folder-icon { color: #10b981; }
            .folder-item.status-error { border-left-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
            .folder-item.status-stopped { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
            
            .status-badge {
                font-size: 0.6rem;
                padding: 2px 8px;
                border-radius: 10px;
                font-weight: 500;
                flex-shrink: 0;
            }
            .status-badge.status-syncing { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
            .status-badge.status-completed { background: rgba(16, 185, 129, 0.2); color: #10b981; }
            .status-badge.status-error { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            .status-badge.status-stopped { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
            .status-badge.status-idle { background: rgba(100, 116, 139, 0.15); color: #94a3b8; }
            
            .folder-progress-container { margin-top: 8px; display: none; }
            .folder-item.status-syncing .folder-progress-container { display: block; }
            .folder-item.status-completed .folder-progress-container { display: block; }
            .folder-progress-bar { background: #334155; border-radius: 10px; height: 6px; overflow: hidden; }
            .folder-progress-bar .progress-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); transition: width 0.5s ease; width: 0%; }
            .folder-progress-text { font-size: 0.6rem; color: #64748b; margin-top: 3px; text-align: right; }
            
            .folder-actions { display: flex; gap: 4px; flex-shrink: 0; }
            .folder-actions button { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; transition: all 0.2s; }
            .folder-actions .btn-sync-folder { color: #10b981; }
            .folder-actions .btn-sync-folder:hover { background: rgba(16, 185, 129, 0.2); }
            .folder-actions .btn-stop-folder { color: #fca5a5; }
            .folder-actions .btn-stop-folder:hover { background: rgba(239, 68, 68, 0.2); }
            .folder-actions .btn-remove-folder { color: #64748b; }
            .folder-actions .btn-remove-folder:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
            
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px; padding: 8px; background: #0f172a; border-radius: 10px; border: 1px solid #1e293b; font-size: 0.7rem; color: #94a3b8; }
            .stats-grid .stat-item { text-align: center; }
            .stats-grid .stat-item .stat-value { font-size: 1rem; font-weight: 600; display: block; }
            .stats-grid .stat-item .stat-value.green { color: #10b981; }
            .stats-grid .stat-item .stat-value.yellow { color: #f59e0b; }
            .stats-grid .stat-item .stat-value.red { color: #ef4444; }
            
            #addFolderModal input:focus { border-color: #3b82f6; outline: none; }
            .folder-item .folder-local-path { word-break: break-all; }
            
            .sync-tab-btn {
                flex: 1;
                padding: 10px;
                border: none;
                border-radius: 8px;
                background: #3b82f6;
                color: white;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.9rem;
                font-family: 'Inter', sans-serif;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            }
            .sync-tab-btn:hover {
                background: #2563eb;
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
            width: 520px;
            max-height: 720px;
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

        syncPanel.innerHTML = `
            <!-- Cabecera -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="font-size:1rem;font-weight:600;color:#f1f5f9;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-folder-tree" style="color:#60a5fa;"></i>
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

            <!-- Barra de herramientas -->
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <button id="addFolderBtn" class="sync-tab-btn" style="flex:2;background:#3b82f6;">
                    <i class="fas fa-plus"></i> Agregar Carpeta
                </button>
                <button id="syncAllFoldersBtn" class="sync-tab-btn" style="flex:1;background:#8b5cf6;">
                    <i class="fas fa-play"></i> Sincronizar
                </button>
                <button id="stopAllFoldersBtn" class="sync-tab-btn" style="flex:1;background:#7f1d1d;color:#fca5a5;display:none;">
                    <i class="fas fa-stop"></i> Detener
                </button>
                <button id="clearFoldersBtn" class="sync-tab-btn" style="flex:0.5;background:#7f1d1d;color:#fca5a5;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <!-- Lista de carpetas -->
            <div id="foldersListContainer" style="max-height:280px;overflow-y:auto;margin-bottom:10px;">
                <div id="foldersList" style="display:flex;flex-direction:column;gap:6px;">
                    <div style="text-align:center;color:#64748b;padding:30px 10px;font-size:0.85rem;">
                        <i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                        No hay carpetas agregadas
                        <br><small style="color:#475569;">Presiona "Agregar Carpeta" para comenzar</small>
                    </div>
                </div>
            </div>

            <!-- Estadísticas -->
            <div class="stats-grid">
                <div class="stat-item"><span class="stat-value" id="totalFoldersCount">0</span> 📁 Total</div>
                <div class="stat-item"><span class="stat-value green" id="syncedFoldersCount">0</span> ✅ Sincronizadas</div>
                <div class="stat-item"><span class="stat-value yellow" id="activeFoldersCount">0</span> 🔄 Activas</div>
                <div class="stat-item"><span class="stat-value red" id="errorFoldersCount">0</span> ❌ Errores</div>
            </div>

            <!-- Estadísticas de archivos -->
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;padding:8px;background:#0f172a;border-radius:10px;border:1px solid #1e293b;font-size:0.7rem;color:#94a3b8;">
                <div style="text-align:center;">
                    <span style="display:block;font-size:1rem;font-weight:600;color:#f1f5f9;" id="syncFileCount">0</span>
                    📁 Archivos
                </div>
                <div style="text-align:center;">
                    <span style="display:block;font-size:1rem;font-weight:600;color:#10b981;" id="syncSyncedCount">0</span>
                    ✅ Sincronizados
                </div>
                <div style="text-align:center;">
                    <span style="display:block;font-size:1rem;font-weight:600;color:#f59e0b;" id="syncPendingCount">0</span>
                    ⏳ Pendientes
                </div>
            </div>

            <!-- Última actividad y Log -->
            <div style="font-size:0.65rem;color:#64748b;text-align:center;margin-top:8px;" id="syncLastActivity">Última actividad: -</div>

            <div id="syncLog" style="margin-top:6px;background:#0f172a;border-radius:8px;padding:8px;max-height:80px;overflow-y:auto;font-size:0.7rem;color:#94a3b8;border:1px solid #1e293b;">
                <div id="syncLogContent"></div>
            </div>

            <!-- Footer -->
            <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid #334155;font-size:0.55rem;color:#475569;">
                <span>🟢 = Sincronizado | 🟡 = En progreso | 🔴 = Error</span>
                <span id="syncVersion">v7.2 - Gestor de Carpetas</span>
            </div>
        `;

        document.body.appendChild(syncPanel);

        // ============================================================
        //  BOTÓN FLOTANTE
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
        toggleBtn.innerHTML = '<i class="fas fa-folder-tree"></i>';
        toggleBtn.title = 'Sincronización - Gestor de Carpetas';

        toggleBtn.addEventListener('mouseenter', () => { toggleBtn.style.transform = 'scale(1.1)'; });
        toggleBtn.addEventListener('mouseleave', () => { toggleBtn.style.transform = 'scale(1)'; });

        toggleBtn.addEventListener('click', () => {
            const panel = document.getElementById('syncPanel');
            if (panel.style.display === 'none' || panel.style.display === '') {
                panel.style.display = 'block';
                toggleBtn.style.display = 'none';
                checkServerStatus();
                loadSavedFolders();
            }
        });

        document.body.appendChild(toggleBtn);

        // ============================================================
        //  GUARDAR REFERENCIAS
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
            reconnectBtn: document.getElementById('syncReconnectBtn'),
            fileCount: document.getElementById('syncFileCount'),
            syncedCount: document.getElementById('syncSyncedCount'),
            pendingCount: document.getElementById('syncPendingCount'),
            lastActivity: document.getElementById('syncLastActivity'),
            logContent: document.getElementById('syncLogContent'),
            minimizeBtn: document.getElementById('syncMinimizeBtn'),
            closeBtn: document.getElementById('syncCloseBtn'),
            version: document.getElementById('syncVersion'),
            foldersList: document.getElementById('foldersList'),
            folderCountBadge: document.getElementById('folderCountBadge'),
            addFolderBtn: document.getElementById('addFolderBtn'),
            syncAllFoldersBtn: document.getElementById('syncAllFoldersBtn'),
            stopAllFoldersBtn: document.getElementById('stopAllFoldersBtn'),
            clearFoldersBtn: document.getElementById('clearFoldersBtn'),
            totalFoldersCount: document.getElementById('totalFoldersCount'),
            syncedFoldersCount: document.getElementById('syncedFoldersCount'),
            activeFoldersCount: document.getElementById('activeFoldersCount'),
            errorFoldersCount: document.getElementById('errorFoldersCount')
        };

        setupUIEvents();
        SYNC_CONFIG.serverCheckInterval = setInterval(checkServerStatus, 30000);
        loadSavedFolders();
        loadSavedConfig();
    }

    // ============================================================
    //  CARGAR CONFIGURACIÓN
    // ============================================================

    function loadSavedConfig() {
        // No hay configuración específica que cargar
    }

    // ============================================================
    //  GESTIÓN DE CARPETAS
    // ============================================================

    function loadSavedFolders() {
        try {
            const saved = localStorage.getItem('syncFolders');
            if (saved) {
                SYNC_CONFIG.syncFolders = JSON.parse(saved);
                renderFoldersList();
                updateFolderBadge();
                updateFolderStats();
                updateFileStats();
                checkFolderStatuses();
            }
        } catch (e) {
            console.error('Error cargando carpetas:', e);
        }
    }

    function saveFolders() {
        try {
            localStorage.setItem('syncFolders', JSON.stringify(SYNC_CONFIG.syncFolders));
            renderFoldersList();
            updateFolderBadge();
            updateFolderStats();
            updateFileStats();
        } catch (e) {
            console.error('Error guardando carpetas:', e);
        }
    }

    function updateFolderBadge() {
        // No hay badge que actualizar
    }

    function updateFolderStats() {
        const ui = SYNC_CONFIG.uiElements;
        const folders = SYNC_CONFIG.syncFolders;
        const total = folders.length;
        const synced = folders.filter(f => f.status === 'completed').length;
        const active = folders.filter(f => f.status === 'syncing').length;
        const errors = folders.filter(f => f.status === 'error').length;

        if (ui.totalFoldersCount) ui.totalFoldersCount.textContent = total;
        if (ui.syncedFoldersCount) ui.syncedFoldersCount.textContent = synced;
        if (ui.activeFoldersCount) ui.activeFoldersCount.textContent = active;
        if (ui.errorFoldersCount) ui.errorFoldersCount.textContent = errors;
    }

    function updateFileStats() {
        const ui = SYNC_CONFIG.uiElements;
        let totalFiles = 0;
        let syncedFiles = 0;

        SYNC_CONFIG.syncFolders.forEach(folder => {
            totalFiles += folder.files || 0;
            syncedFiles += folder.synced || 0;
        });

        if (ui.fileCount) ui.fileCount.textContent = totalFiles;
        if (ui.syncedCount) ui.syncedCount.textContent = syncedFiles;
        if (ui.pendingCount) ui.pendingCount.textContent = totalFiles - syncedFiles;
    }

    // ============================================================
    //  VERIFICAR ESTADO DE CARPETAS EN EL SERVIDOR
    // ============================================================

    async function checkFolderStatuses() {
        try {
            const response = await fetch(`${SYNC_CONFIG.serverUrl}/api/sync/status`);
            if (response.ok) {
                const data = await response.json();
                if (data.folders) {
                    Object.keys(data.folders).forEach(remoteName => {
                        const folder = SYNC_CONFIG.syncFolders.find(f => f.remoteName === remoteName);
                        if (folder) {
                            const status = data.folders[remoteName];
                            folder.status = status.status || 'idle';
                            folder.files = status.totalFiles || 0;
                            folder.synced = status.syncedFiles || 0;
                            folder.progress = status.progress || 0;
                        }
                    });
                    renderFoldersList();
                    updateFolderStats();
                    updateFileStats();
                }
            }
        } catch (error) {
            console.error('Error verificando estados:', error);
        }
    }

    // ============================================================
    //  RENDERIZAR LISTA DE CARPETAS
    // ============================================================

    function renderFoldersList() {
        const ui = SYNC_CONFIG.uiElements;
        const folders = SYNC_CONFIG.syncFolders;

        if (folders.length === 0) {
            ui.foldersList.innerHTML = `
                <div style="text-align:center;color:#64748b;padding:30px 10px;font-size:0.85rem;">
                    <i class="fas fa-folder-open" style="font-size:2rem;display:block;margin-bottom:10px;"></i>
                    No hay carpetas agregadas
                    <br><small style="color:#475569;">Presiona "Agregar Carpeta" para comenzar</small>
                </div>
            `;
            return;
        }

        ui.foldersList.innerHTML = folders.map((folder, index) => {
            const status = folder.status || 'idle';
            const isSynced = status === 'completed';
            const isActive = status === 'syncing';
            const isError = status === 'error';
            
            const statusIcon = getStatusIcon(status);
            const statusText = getStatusText(status);
            const statusClass = getStatusClass(status);
            const progress = folder.progress || 0;

            return `
                <div class="folder-item ${statusClass}" style="border:1px solid ${isSynced ? '#10b981' : isError ? '#ef4444' : isActive ? '#f59e0b' : '#1e293b'};">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
                        <div style="flex:1;min-width:0;overflow:hidden;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <i class="fas fa-folder folder-icon" style="color:${isSynced ? '#10b981' : isError ? '#ef4444' : isActive ? '#f59e0b' : '#f59e0b'};flex-shrink:0;"></i>
                                <span class="folder-name" style="font-weight:500;font-size:0.85rem;color:${isSynced ? '#10b981' : isError ? '#ef4444' : '#f1f5f9'};word-break:break-all;flex:1;">
                                    ${escapeHtml(folder.localPath)}
                                </span>
                                <span class="status-badge ${statusClass}">${statusIcon} ${statusText}</span>
                            </div>
                            <div style="font-size:0.7rem;color:#94a3b8;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <span>☁️ ${escapeHtml(folder.remoteName)}</span>
                                ${folder.files ? `<span>• 📁 ${folder.files} archivos</span>` : ''}
                                ${folder.synced ? `<span>• ✅ ${folder.synced} sincronizados</span>` : ''}
                                ${folder.error ? `<span style="color:#ef4444;">• ${escapeHtml(folder.error)}</span>` : ''}
                            </div>
                        </div>
                        <div class="folder-actions">
                            ${!isActive ? `
                                <button class="btn-sync-folder" data-index="${index}" title="Sincronizar carpeta">
                                    <i class="fas fa-play"></i>
                                </button>
                            ` : `
                                <button class="btn-stop-folder" data-index="${index}" title="Detener sincronización">
                                    <i class="fas fa-stop"></i>
                                </button>
                            `}
                            <button class="btn-remove-folder" data-index="${index}" title="Eliminar carpeta">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="folder-progress-container">
                        <div class="folder-progress-bar">
                            <div class="progress-fill" style="width:${progress}%;"></div>
                        </div>
                        <div class="folder-progress-text">${progress}% sincronizado</div>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos para los botones de cada carpeta
        document.querySelectorAll('.btn-sync-folder').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                startFolderSync(index);
            });
        });

        document.querySelectorAll('.btn-stop-folder').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                stopFolderSync(index);
            });
        });

        document.querySelectorAll('.btn-remove-folder').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const folder = SYNC_CONFIG.syncFolders[index];
                if (folder && confirm(`¿Eliminar la carpeta "${folder.localPath}"?`)) {
                    SYNC_CONFIG.syncFolders.splice(index, 1);
                    saveFolders();
                    addLog(`🗑️ Carpeta eliminada: ${folder.localPath}`, 'warning');
                }
            });
        });
    }

    // ============================================================
    //  FUNCIONES DE SINCRONIZACIÓN
    // ============================================================

    async function startFolderSync(index) {
        const folder = SYNC_CONFIG.syncFolders[index];
        if (!folder) return;

        try {
            folder.status = 'syncing';
            folder.progress = 0;
            folder.error = null;
            saveFolders();
            updateFolderStats();
            updateFileStats();
            addLog(`🚀 Iniciando sincronización: ${folder.localPath} → ${folder.remoteName}`, 'info');

            const response = await fetch(`${SYNC_CONFIG.serverUrl}/api/sync/start`, {
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
            folder.synced = data.synced || 0;
            folder.progress = data.progress || 0;
            folder.status = data.status || 'syncing';
            saveFolders();
            updateFileStats();
            addLog(`✅ Sincronización iniciada: ${folder.remoteName}`, 'success');
            
            // Conectar a eventos
            if (!SYNC_CONFIG.eventSource) {
                connectToEvents();
            }

        } catch (error) {
            folder.status = 'error';
            folder.error = error.message;
            saveFolders();
            updateFolderStats();
            updateFileStats();
            addLog(`❌ Error: ${error.message}`, 'error');
        }
    }

    function stopFolderSync(index) {
        const folder = SYNC_CONFIG.syncFolders[index];
        if (!folder) return;

        addLog(`⏹️ Deteniendo sincronización: ${folder.remoteName}`, 'warning');

        fetch(`${SYNC_CONFIG.serverUrl}/api/sync/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remoteFolder: folder.remoteName })
        })
        .then(() => {
            folder.status = 'stopped';
            saveFolders();
            updateFolderStats();
            updateFileStats();
            addLog(`⏹️ Detenido: ${folder.remoteName}`, 'warning');
        })
        .catch(err => {
            addLog(`❌ Error al detener: ${err.message}`, 'error');
        });
    }

    // ============================================================
    //  CONECTAR A EVENTOS Y PROCESAR PROGRESO
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

    function handleSyncEvent(data) {
        // Buscar la carpeta por remoteName
        const folder = SYNC_CONFIG.syncFolders.find(f => f.remoteName === data.folder);
        if (!folder) return;

        switch (data.event) {
            case 'file_synced':
                folder.files = data.total || folder.files || 0;
                folder.synced = data.synced || folder.synced || 0;
                folder.progress = data.progress || 0;
                if (data.progress >= 100) {
                    folder.status = 'completed';
                }
                saveFolders();
                updateFolderStats();
                updateFileStats();
                break;
            case 'folder_status':
                folder.files = data.total || folder.files || 0;
                folder.synced = data.synced || folder.synced || 0;
                folder.progress = data.progress || 0;
                folder.status = data.status || folder.status;
                saveFolders();
                updateFolderStats();
                updateFileStats();
                break;
            case 'sync_complete':
                folder.status = 'completed';
                folder.progress = 100;
                folder.files = data.total || folder.files || 0;
                folder.synced = data.synced || folder.synced || 0;
                saveFolders();
                updateFolderStats();
                updateFileStats();
                addLog(`✅ Sincronización completada: ${folder.remoteName}`, 'success');
                break;
            case 'sync_error':
                folder.status = 'error';
                folder.error = data.message;
                saveFolders();
                updateFolderStats();
                updateFileStats();
                addLog(`❌ Error: ${data.message}`, 'error');
                break;
            case 'file_added':
            case 'file_changed':
            case 'file_deleted':
                addLog(`📄 ${data.event === 'file_added' ? 'Archivo añadido' : data.event === 'file_changed' ? 'Archivo modificado' : 'Archivo eliminado'}: ${data.filename}`, 'info');
                break;
        }
    }

    // ============================================================
    //  SINCRONIZAR TODAS LAS CARPETAS
    // ============================================================

    async function syncAllFolders() {
        const folders = SYNC_CONFIG.syncFolders;

        if (folders.length === 0) {
            addLog('⚠️ No hay carpetas para sincronizar', 'warning');
            return;
        }

        const ui = SYNC_CONFIG.uiElements;
        ui.syncAllFoldersBtn.style.display = 'none';
        ui.stopAllFoldersBtn.style.display = 'block';

        let syncedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            if (folder.status !== 'syncing' && folder.status !== 'completed') {
                addLog(`📂 Procesando ${i+1}/${folders.length}: ${folder.localPath}`, 'info');
                await startFolderSync(i);
                // Esperar un poco para que se actualice el progreso
                await new Promise(resolve => setTimeout(resolve, 2000));
                if (folder.status === 'completed') syncedCount++;
                if (folder.status === 'error') errorCount++;
            }
        }

        ui.syncAllFoldersBtn.style.display = 'block';
        ui.stopAllFoldersBtn.style.display = 'none';

        addLog(`✅ Sincronización completada: ${syncedCount} carpetas sincronizadas, ${errorCount} errores`, 'success');
    }

    function stopAllFolders() {
        SYNC_CONFIG.syncFolders.forEach((folder, index) => {
            if (folder.status === 'syncing') {
                stopFolderSync(index);
            }
        });
        const ui = SYNC_CONFIG.uiElements;
        ui.syncAllFoldersBtn.style.display = 'block';
        ui.stopAllFoldersBtn.style.display = 'none';
    }

    function clearAllFolders() {
        if (SYNC_CONFIG.syncFolders.length === 0) {
            addLog('⚠️ No hay carpetas para limpiar', 'warning');
            return;
        }

        if (confirm('¿Eliminar TODAS las carpetas de la lista?')) {
            SYNC_CONFIG.syncFolders = [];
            saveFolders();
            addLog('🗑️ Todas las carpetas eliminadas', 'warning');
        }
    }

    // ============================================================
    //  AGREGAR CARPETA (MODAL)
    // ============================================================

    function showAddFolderModal() {
        const overlay = document.createElement('div');
        overlay.id = 'addFolderModal';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
            animation: fadeIn 0.2s ease;
        `;

        overlay.innerHTML = `
            <div style="background:#1e293b;border-radius:16px;padding:28px;max-width:450px;width:90%;border:1px solid #475569;box-shadow:0 20px 60px rgba(0,0,0,0.8);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="color:#f1f5f9;font-size:1.1rem;display:flex;align-items:center;gap:8px;">
                        <i class="fas fa-folder-plus" style="color:#60a5fa;"></i>
                        Agregar Carpeta
                    </h3>
                    <button id="modalCloseBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;font-size:1.2rem;" onmouseover="this.style.background='#7f1d1d';this.style.color='#fca5a5'" onmouseout="this.style.background='transparent';this.style.color='#94a3b8'">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;">📁 Carpeta local</label>
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="modalLocalPath" placeholder="C:/ruta/a/carpeta" 
                               style="flex:1;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                        <button id="modalBrowseBtn" style="padding:8px 14px;border-radius:10px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:0.85rem;transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                            <i class="fas fa-folder-open"></i>
                        </button>
                    </div>
                </div>
                <div style="margin-bottom:16px;">
                    <label style="font-size:0.75rem;color:#94a3b8;display:block;margin-bottom:4px;">☁️ Nombre en la nube</label>
                    <input type="text" id="modalRemoteName" placeholder="nombre_carpeta" 
                           style="width:100%;padding:8px 12px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#f1f5f9;font-size:0.85rem;font-family:'Inter',sans-serif;outline:none;">
                    <div style="font-size:0.6rem;color:#64748b;margin-top:4px;">
                        💡 Solo letras, números, guiones y guión bajo
                    </div>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button id="modalCancelBtn" style="padding:8px 20px;border-radius:10px;border:none;background:#334155;color:#94a3b8;cursor:pointer;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#475569';this.style.color='#f1f5f9'" onmouseout="this.style.background='#334155';this.style.color='#94a3b8'">
                        Cancelar
                    </button>
                    <button id="modalConfirmBtn" style="padding:8px 20px;border-radius:10px;border:none;background:#10b981;color:white;cursor:pointer;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                        <i class="fas fa-plus"></i> Agregar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => document.getElementById('modalLocalPath').focus(), 100);

        document.getElementById('modalCloseBtn').addEventListener('click', () => overlay.remove());
        document.getElementById('modalCancelBtn').addEventListener('click', () => overlay.remove());

        document.getElementById('modalConfirmBtn').addEventListener('click', () => {
            const localPath = document.getElementById('modalLocalPath').value.trim();
            const remoteName = document.getElementById('modalRemoteName').value.trim();

            if (!localPath) {
                showToast('⚠️ Ingresa la ruta de la carpeta local', 'warning');
                document.getElementById('modalLocalPath').focus();
                return;
            }
            if (!remoteName) {
                showToast('⚠️ Ingresa un nombre para la carpeta en la nube', 'warning');
                document.getElementById('modalRemoteName').focus();
                return;
            }

            if (!remoteName.match(/^[a-zA-Z0-9_\-]+$/)) {
                showToast('❌ El nombre solo puede contener letras, números, guiones y guión bajo', 'error');
                document.getElementById('modalRemoteName').focus();
                return;
            }

            const exists = SYNC_CONFIG.syncFolders.some(f => 
                f.localPath === localPath || f.remoteName === remoteName
            );

            if (exists) {
                showToast('⚠️ Esta carpeta ya está agregada', 'warning');
                return;
            }

            SYNC_CONFIG.syncFolders.push({
                id: generateValidId(),
                localPath: localPath,
                remoteName: remoteName,
                status: 'idle',
                files: 0,
                synced: 0,
                progress: 0,
                addedAt: new Date().toISOString()
            });

            saveFolders();
            overlay.remove();
            showToast(`✅ Carpeta agregada: ${localPath} → ${remoteName}`, 'success');
            addLog(`📁 Carpeta agregada: ${localPath} → ${remoteName}`, 'success');
        });

        document.getElementById('modalBrowseBtn').addEventListener('click', () => {
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
                    document.getElementById('modalLocalPath').value = fullPath;
                    const remoteName = fullPath.split('/').pop().toLowerCase().replace(/\s+/g, '_');
                    if (!document.getElementById('modalRemoteName').value) {
                        document.getElementById('modalRemoteName').value = remoteName;
                    }
                    document.getElementById('modalConfirmBtn').focus();
                }).catch(() => {});
            } else {
                const input = document.createElement('input');
                input.type = 'file';
                input.webkitdirectory = true;
                input.directory = true;
                input.onchange = (e) => {
                    if (e.target.files.length > 0) {
                        const path = e.target.files[0].webkitRelativePath.split('/')[0];
                        document.getElementById('modalLocalPath').value = 'C:/' + path;
                        const remoteName = path.toLowerCase().replace(/\s+/g, '_');
                        if (!document.getElementById('modalRemoteName').value) {
                            document.getElementById('modalRemoteName').value = remoteName;
                        }
                        document.getElementById('modalConfirmBtn').focus();
                    }
                };
                input.click();
            }
        });

        document.getElementById('modalLocalPath').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('modalRemoteName').focus();
        });
        document.getElementById('modalRemoteName').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('modalConfirmBtn').click();
        });

        document.addEventListener('keydown', function handler(e) {
            if (e.key === 'Escape' && document.getElementById('addFolderModal')) {
                document.getElementById('addFolderModal').remove();
                document.removeEventListener('keydown', handler);
            }
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // ============================================================
    //  TOAST Y LOGGING
    // ============================================================

    function showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message;
            toast.className = 'toast show' + (type === 'error' ? ' error' : '');
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
                toast.className = 'toast';
            }, 3500);
        } else {
            console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        }
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
                    updateStatus('running', 'Servidor activo');
                } else {
                    updateStatus('idle', 'Servidor listo');
                }

                if (!SYNC_CONFIG.eventSource) {
                    connectToEvents();
                }
                checkFolderStatuses();
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
    //  ESTADO
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

    // ============================================================
    //  EVENTOS UI
    // ============================================================

    function setupUIEvents() {
        const ui = SYNC_CONFIG.uiElements;

        ui.minimizeBtn.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.toggleBtn.style.display = 'flex';
        });
        ui.closeBtn.addEventListener('click', () => {
            ui.panel.style.display = 'none';
            ui.toggleBtn.style.display = 'flex';
        });

        ui.reconnectBtn.addEventListener('click', checkServerStatus);

        ui.addFolderBtn.addEventListener('click', showAddFolderModal);
        ui.syncAllFoldersBtn.addEventListener('click', syncAllFolders);
        ui.stopAllFoldersBtn.addEventListener('click', stopAllFolders);
        ui.clearFoldersBtn.addEventListener('click', clearAllFolders);
    }

    // ============================================================
    //  INICIALIZACIÓN
    // ============================================================

    function initSync() {
        console.log('🔄 Inicializando sincronizador v7.2 (Gestor de Carpetas)...');
        const checkIcons = setInterval(() => {
            if (document.querySelector('link[href*="font-awesome"]') ||
                document.querySelector('script[src*="font-awesome"]')) {
                clearInterval(checkIcons);
                createSyncUI();
                addLog('👋 ¡Bienvenido! Gestiona tus carpetas aquí', 'info');
                setTimeout(checkServerStatus, 1500);
                loadSavedFolders();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkIcons);
            if (!document.getElementById('syncPanel')) {
                createSyncUI();
                addLog('👋 ¡Bienvenido! Gestiona tus carpetas aquí', 'info');
                setTimeout(checkServerStatus, 1500);
                loadSavedFolders();
            }
        }, 3000);
        console.log('✅ Sincronizador v7.2 inicializado');
    }

    // ============================================================
    //  EXPORTAR
    // ============================================================

    window.SyncManager = {
        init: initSync,
        getStatus: () => SYNC_CONFIG.isRunning,
        addLog: addLog,
        reconnect: checkServerStatus,
        getFolders: () => SYNC_CONFIG.syncFolders,
        addFolder: (localPath, remoteName) => {
            SYNC_CONFIG.syncFolders.push({
                id: generateValidId(),
                localPath: localPath,
                remoteName: remoteName,
                status: 'idle',
                files: 0,
                synced: 0,
                progress: 0,
                addedAt: new Date().toISOString()
            });
            saveFolders();
        },
        syncAll: syncAllFolders,
        stopAll: stopAllFolders,
        clearAll: clearAllFolders
    };

    // ============================================================
    //  AUTO-INICIAR
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSync);
    } else {
        setTimeout(initSync, 500);
    }
    console.log('📦 sync.js v7.2 cargado correctamente');

})();
