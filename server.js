// server.js - Servidor COMPLETO con soporte para múltiples carpetas
// EJECUTAR: node server.js

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const chokidar = require('chokidar');
const { exec } = require('child_process');

const app = express();
const PORT = 3001;

// ============================================================
//  MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(express.static(__dirname));

// ============================================================
//  VERIFICAR index.html
// ============================================================

const INDEX_PATH = path.join(__dirname, 'index.html');
if (!fs.existsSync(INDEX_PATH)) {
    console.error('❌ ERROR: No se encuentra index.html');
    console.error(`📁 Buscado en: ${INDEX_PATH}`);
    process.exit(1);
}
console.log('✅ index.html encontrado');

// ============================================================
//  RUTAS PRINCIPALES
// ============================================================

app.get('/', (req, res) => {
    res.sendFile(INDEX_PATH);
});

// ============================================================
//  CONFIGURACIÓN
// ============================================================

const CONFIG = {
    CLOUD_NAME: "dc1zqri3o",
    UPLOAD_PRESET: "ncc_nordic",
    FIREBASE_REST_URL: "https://trip-a9341-default-rtdb.firebaseio.com"
};

// ============================================================
//  FUNCIONES DE UTILIDAD
// ============================================================

function normalizePath(inputPath) {
    if (!inputPath) return '';
    let cleaned = inputPath.trim();
    cleaned = cleaned.replace(/\\/g, '/');
    cleaned = path.resolve(cleaned);
    cleaned = cleaned.replace(/\\/g, '/');
    return cleaned;
}

function ensureFolder(folderPath) {
    const normalized = normalizePath(folderPath);
    if (!fs.existsSync(normalized)) {
        fs.mkdirSync(normalized, { recursive: true });
        console.log(`📁 Carpeta CREADA: ${normalized}`);
        return { created: true, path: normalized };
    }
    console.log(`📁 Carpeta existe: ${normalized}`);
    return { created: false, path: normalized };
}

function formatSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

function getFileType(filename) {
    const ext = getFileExtension(filename);
    const types = {
        'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
        'bmp': 'image', 'svg': 'image', 'webp': 'image', 'ico': 'image',
        'mp4': 'video', 'avi': 'video', 'mov': 'video', 'mkv': 'video',
        'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'flac': 'audio',
        'pdf': 'document', 'doc': 'document', 'docx': 'document',
        'xls': 'document', 'xlsx': 'document', 'ppt': 'document',
        'pptx': 'document', 'txt': 'document',
        'zip': 'archive', 'rar': 'archive', '7z': 'archive',
        'tar': 'archive', 'gz': 'archive', 'bz2': 'archive', 'xz': 'archive',
        'dwg': 'cad', 'dxf': 'cad', 'geo': 'cad', 'trm': 'cad', 'bup': 'cad',
        'ln3': 'cad'
    };
    return types[ext] || 'other';
}

// ============================================================
//  FUNCIONES PARA FIREBASE
// ============================================================

async function firebaseGet(path) {
    try {
        const response = await fetch(`${CONFIG.FIREBASE_REST_URL}/${path}.json`);
        return await response.json();
    } catch (error) {
        console.error('Error GET Firebase:', error);
        return null;
    }
}

async function firebasePut(path, data) {
    try {
        const response = await fetch(`${CONFIG.FIREBASE_REST_URL}/${path}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error PUT Firebase:', error);
        return null;
    }
}

async function firebasePost(path, data) {
    try {
        const response = await fetch(`${CONFIG.FIREBASE_REST_URL}/${path}.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    } catch (error) {
        console.error('Error POST Firebase:', error);
        return null;
    }
}

async function firebaseDelete(path) {
    try {
        const response = await fetch(`${CONFIG.FIREBASE_REST_URL}/${path}.json`, {
            method: 'DELETE'
        });
        return response.ok;
    } catch (error) {
        console.error('Error DELETE Firebase:', error);
        return false;
    }
}

// ============================================================
//  FUNCIÓN PARA CLOUDINARY
// ============================================================

async function uploadToCloudinary(fileBuffer, filename) {
    try {
        console.log(`📤 Subiendo a Cloudinary: ${filename}`);
        console.log(`   📦 Tamaño: ${formatSize(fileBuffer.length)}`);

        const blob = new Blob([fileBuffer]);
        const form = new FormData();
        form.append('file', blob, filename);
        form.append('upload_preset', CONFIG.UPLOAD_PRESET);

        const url = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUD_NAME}/raw/upload`;
        console.log(`   🌐 URL: ${url}`);
        console.log(`   📋 Preset: ${CONFIG.UPLOAD_PRESET}`);

        const response = await fetch(url, {
            method: 'POST',
            body: form
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Cloudinary error response:', JSON.stringify(data, null, 2));
            console.error('❌ Status:', response.status);
            console.error('❌ StatusText:', response.statusText);
            throw new Error(data.error?.message || 'Error en Cloudinary');
        }

        console.log(`✅ Subido a Cloudinary: ${filename}`);
        console.log(`   🔗 URL: ${data.secure_url}`);
        return {
            success: true,
            url: data.secure_url,
            public_id: data.public_id,
            format: data.format,
            bytes: data.bytes
        };
    } catch (error) {
        console.error('❌ Error Cloudinary:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================================
//  FUNCIÓN DE SINCRONIZACIÓN POR CARPETA
// ============================================================

async function syncFolder(localPath, remoteFolder) {
    console.log(`🔄 Sincronizando: ${localPath} → Firebase/${remoteFolder}`);
    console.log('═══════════════════════════════════════════════════════════');
    
    const folderCheck = ensureFolder(localPath);
    if (!folderCheck.path) {
        throw new Error(`No se pudo acceder a la carpeta: ${localPath}`);
    }
    
    // Crear carpeta remota en Firebase
    await firebasePut(`${remoteFolder}/_folders`, {
        root: {
            name: remoteFolder,
            path: '/',
            createdAt: new Date().toISOString(),
            synced: true
        }
    });
    console.log(`📁 Carpeta remota creada en Firebase: ${remoteFolder}`);
    
    // Obtener archivos existentes en Firebase
    const existingData = await firebaseGet(remoteFolder);
    const existingFiles = new Map();
    if (existingData) {
        Object.keys(existingData).forEach(key => {
            if (key !== '_folders' && key !== '_structure') {
                const fileData = existingData[key];
                if (fileData && fileData.filename) {
                    existingFiles.set(fileData.filename, {
                        id: key,
                        ...fileData
                    });
                }
            }
        });
    }
    console.log(`📊 Archivos existentes en Firebase: ${existingFiles.size}`);
    
    // Escanear carpeta local
    const localFiles = [];
    const folders = new Set();
    
    function scanDirectory(dir, relativePath = '') {
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                const itemPath = path.join(dir, item.name);
                const relPath = relativePath ? `${relativePath}/${item.name}` : item.name;
                if (item.isDirectory()) {
                    folders.add(relPath);
                    scanDirectory(itemPath, relPath);
                } else {
                    const stats = fs.statSync(itemPath);
                    localFiles.push({
                        name: item.name,
                        path: itemPath,
                        relativePath: relPath,
                        size: stats.size,
                        modified: stats.mtime.toISOString(),
                        created: stats.birthtime.toISOString(),
                        folder: relativePath || 'general'
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error escaneando ${dir}:`, error);
        }
    }
    
    scanDirectory(localPath);
    console.log(`📁 Archivos locales encontrados: ${localFiles.length}`);
    
    if (localFiles.length === 0) {
        console.log('⚠️ No hay archivos para subir');
        return { 
            success: true, 
            total: 0, 
            synced: 0, 
            errors: 0,
            errorMessages: [],
            message: 'No hay archivos para sincronizar'
        };
    }
    
    // Crear estructura de carpetas en Firebase
    for (const folder of folders) {
        const folderKey = folder.replace(/\//g, '_');
        await firebasePut(`${remoteFolder}/_folders/${folderKey}`, {
            name: folder,
            path: folder,
            createdAt: new Date().toISOString(),
            synced: true
        });
        console.log(`📁 Carpeta creada en Firebase: ${folder}`);
    }
    
    let syncedCount = 0;
    let errorCount = 0;
    let errorMessages = [];
    let skippedCount = 0;
    const totalFiles = localFiles.length;
    
    for (let i = 0; i < localFiles.length; i++) {
        const file = localFiles[i];
        const progress = Math.round(((i + 1) / totalFiles) * 100);
        
        try {
            const existing = existingFiles.get(file.name);
            if (existing && existing.size === file.size && existing.folder === file.folder) {
                console.log(`⏭️ Saltando (sin cambios): ${file.name}`);
                skippedCount++;
                continue;
            }
            
            console.log(`📤 Subiendo [${i+1}/${totalFiles}] ${file.name} (${formatSize(file.size)})`);
            
            const fileBuffer = fs.readFileSync(file.path);
            const cloudinaryResult = await uploadToCloudinary(fileBuffer, file.name);
            
            if (!cloudinaryResult.success) {
                console.error(`❌ Error subiendo ${file.name}: ${cloudinaryResult.error}`);
                errorCount++;
                errorMessages.push(`${file.name}: ${cloudinaryResult.error}`);
                continue;
            }
            
            const fileData = {
                filename: file.name,
                size: file.size,
                url: cloudinaryResult.url,
                type: getFileType(file.name),
                extension: getFileExtension(file.name),
                date: new Date().toISOString(),
                uploadedBy: 'sincronizador_local',
                folder: file.folder || 'general',
                cloudinaryId: cloudinaryResult.public_id,
                localPath: file.path,
                syncHash: cloudinaryResult.public_id + file.modified,
                syncedAt: new Date().toISOString(),
                relativePath: file.relativePath
            };
            
            await firebasePost(remoteFolder, fileData);
            console.log(`✅ Guardado en Firebase: ${file.name} → ${remoteFolder}`);
            syncedCount++;
            
            // Emitir progreso
            broadcastEvent({
                event: 'file_synced',
                folder: remoteFolder,
                filename: file.name,
                progress: progress,
                total: totalFiles,
                synced: syncedCount
            });
            
        } catch (error) {
            console.error(`❌ Error sincronizando ${file.name}:`, error);
            errorCount++;
            errorMessages.push(`${file.name}: ${error.message}`);
        }
    }
    
    await firebasePut(`${remoteFolder}/_structure`, {
        lastSync: new Date().toISOString(),
        totalFiles: localFiles.length,
        syncedFiles: syncedCount,
        errorFiles: errorCount,
        skippedFiles: skippedCount,
        errors: errorMessages,
        localFolder: localPath,
        remoteFolder: remoteFolder
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Sincronización completada:`);
    console.log(`   📁 Total archivos: ${localFiles.length}`);
    console.log(`   ✅ Subidos: ${syncedCount}`);
    console.log(`   ⏭️ Saltados: ${skippedCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    if (errorMessages.length > 0) {
        console.log(`   📋 Errores:\n     ${errorMessages.join('\n     ')}`);
    }
    console.log('═══════════════════════════════════════════════════════════');
    
    // Emitir evento de completado
    broadcastEvent({
        event: 'sync_complete',
        folder: remoteFolder,
        total: localFiles.length,
        synced: syncedCount,
        errors: errorCount
    });
    
    return { 
        success: true, 
        total: localFiles.length, 
        synced: syncedCount, 
        errors: errorCount,
        skipped: skippedCount,
        errorMessages
    };
}

// ============================================================
//  WATCHER EN TIEMPO REAL POR CARPETA
// ============================================================

function startWatcher(localPath, remoteFolder) {
    console.log(`👀 Monitoreando cambios en: ${localPath}`);
    console.log(`☁️ Sincronizando a: Firebase/${remoteFolder}`);
    
    const processing = new Set();
    
    const watcher = chokidar.watch(localPath, {
        persistent: true,
        ignoreInitial: true,
        depth: 10,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
        ignored: /(^|[\/\\])\../
    });
    
    async function processFile(filePath) {
        const fileName = path.basename(filePath);
        const relativePath = path.relative(localPath, filePath).replace(/\\/g, '/');
        const folder = relativePath.includes('/') ? relativePath.split('/')[0] : 'general';
        const fileKey = filePath;
        
        if (processing.has(fileKey)) {
            console.log(`⏭️ ${fileName} ya está siendo procesado`);
            return;
        }
        
        processing.add(fileKey);
        
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`🗑️ Archivo eliminado: ${fileName}`);
                const existingData = await firebaseGet(`${remoteFolder}?orderBy="filename"&equalTo="${fileName}"`);
                if (existingData) {
                    const keys = Object.keys(existingData);
                    for (const key of keys) {
                        if (existingData[key].folder === folder) {
                            await firebaseDelete(`${remoteFolder}/${key}`);
                            console.log(`🗑️ Eliminado de Firebase: ${fileName}`);
                            broadcastEvent({
                                event: 'file_deleted',
                                folder: remoteFolder,
                                filename: fileName,
                                timestamp: new Date().toISOString()
                            });
                            break;
                        }
                    }
                }
                return;
            }
            
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) return;
            
            console.log(`📄 Procesando: ${fileName} (${formatSize(stats.size)})`);
            
            const fileBuffer = fs.readFileSync(filePath);
            const cloudinaryResult = await uploadToCloudinary(fileBuffer, fileName);
            
            if (!cloudinaryResult.success) {
                console.error(`❌ Error subiendo ${fileName}: ${cloudinaryResult.error}`);
                return;
            }
            
            const fileData = {
                filename: fileName,
                size: stats.size,
                url: cloudinaryResult.url,
                type: getFileType(fileName),
                extension: getFileExtension(fileName),
                date: new Date().toISOString(),
                uploadedBy: 'sincronizador_local',
                folder: folder || 'general',
                cloudinaryId: cloudinaryResult.public_id,
                localPath: filePath,
                syncHash: cloudinaryResult.public_id + stats.mtime.getTime(),
                syncedAt: new Date().toISOString(),
                relativePath: relativePath
            };
            
            const existingData = await firebaseGet(`${remoteFolder}?orderBy="filename"&equalTo="${fileName}"`);
            let existingKey = null;
            
            if (existingData) {
                const keys = Object.keys(existingData);
                for (const key of keys) {
                    if (existingData[key].folder === folder) {
                        existingKey = key;
                        break;
                    }
                }
            }
            
            if (existingKey) {
                await firebasePut(`${remoteFolder}/${existingKey}`, fileData);
                console.log(`🔄 Actualizado: ${fileName} → ${folder}`);
                broadcastEvent({
                    event: 'file_changed',
                    folder: remoteFolder,
                    filename: fileName,
                    timestamp: new Date().toISOString()
                });
            } else {
                await firebasePost(remoteFolder, fileData);
                console.log(`✅ Subido: ${fileName} → ${folder}`);
                broadcastEvent({
                    event: 'file_added',
                    folder: remoteFolder,
                    filename: fileName,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error(`❌ Error procesando ${fileName}:`, error);
            broadcastEvent({
                event: 'sync_error',
                folder: remoteFolder,
                message: `Error procesando ${fileName}: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            processing.delete(fileKey);
        }
    }
    
    watcher
        .on('add', (filePath) => processFile(filePath))
        .on('change', (filePath) => processFile(filePath))
        .on('unlink', (filePath) => {
            const fileName = path.basename(filePath);
            const relativePath = path.relative(localPath, filePath).replace(/\\/g, '/');
            const folder = relativePath.includes('/') ? relativePath.split('/')[0] : 'general';
            
            firebaseGet(`${remoteFolder}?orderBy="filename"&equalTo="${fileName}"`).then(existingData => {
                if (existingData) {
                    const keys = Object.keys(existingData);
                    for (const key of keys) {
                        if (existingData[key].folder === folder) {
                            firebaseDelete(`${remoteFolder}/${key}`);
                            console.log(`🗑️ Eliminado de Firebase: ${fileName}`);
                            broadcastEvent({
                                event: 'file_deleted',
                                folder: remoteFolder,
                                filename: fileName,
                                timestamp: new Date().toISOString()
                            });
                            break;
                        }
                    }
                }
            }).catch(err => console.error('Error eliminando archivo:', err));
        })
        .on('addDir', (dirPath) => {
            const relativePath = path.relative(localPath, dirPath).replace(/\\/g, '/');
            console.log(`📁 Nueva carpeta local: ${relativePath}`);
            const folderKey = relativePath.replace(/\//g, '_');
            firebasePut(`${remoteFolder}/_folders/${folderKey}`, {
                name: relativePath,
                path: relativePath,
                createdAt: new Date().toISOString(),
                synced: true
            }).catch(err => console.error('Error creando carpeta remota:', err));
        })
        .on('unlinkDir', (dirPath) => {
            const relativePath = path.relative(localPath, dirPath).replace(/\\/g, '/');
            console.log(`🗑️ Carpeta local eliminada: ${relativePath}`);
            const folderKey = relativePath.replace(/\//g, '_');
            firebaseDelete(`${remoteFolder}/_folders/${folderKey}`).catch(err => {
                console.error('Error eliminando carpeta remota:', err);
            });
        })
        .on('error', (error) => {
            console.error('❌ Watcher error:', error);
            broadcastEvent({
                event: 'sync_error',
                folder: remoteFolder,
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });
    
    return watcher;
}

// ============================================================
//  ESTADO GLOBAL - SOPORTE PARA MÚLTIPLES CARPETAS
// ============================================================

let syncState = {
    running: false,
    activeSyncs: {}, // { remoteFolder: { localFolder, watcher, files, progress, status } },
    files: { total: 0, synced: 0, pending: 0 },
    events: [],
    clients: []
};

function broadcastEvent(event) {
    syncState.events.push(event);
    if (syncState.events.length > 100) syncState.events.shift();
    syncState.clients.forEach(client => {
        try { client.res.write(`data: ${JSON.stringify(event)}\n\n`); } catch (e) {}
    });
}

function getFolderStats(remoteFolder) {
    const active = syncState.activeSyncs[remoteFolder];
    if (active) {
        return {
            total: active.files || 0,
            synced: active.synced || 0,
            pending: (active.files || 0) - (active.synced || 0),
            status: active.status || 'idle',
            progress: active.progress || 0
        };
    }
    return { total: 0, synced: 0, pending: 0, status: 'idle', progress: 0 };
}

// ============================================================
//  RUTAS API
// ============================================================

app.post('/api/sync/check-folder', (req, res) => {
    const { folder } = req.body;
    if (!folder) {
        return res.status(400).json({ error: 'Carpeta no especificada' });
    }
    try {
        const result = ensureFolder(folder);
        res.json({
            exists: true,
            path: result.path,
            originalPath: folder,
            isDirectory: true,
            created: result.created,
            message: result.created ? 'Carpeta creada automáticamente' : 'Carpeta existe'
        });
    } catch (error) {
        res.status(500).json({ exists: false, error: error.message, path: folder });
    }
});

app.post('/api/sync/check-remote-folder', async (req, res) => {
    const { remoteFolder } = req.body;
    if (!remoteFolder) {
        return res.status(400).json({ error: 'Nombre de carpeta remota no especificado' });
    }
    try {
        const data = await firebaseGet(`${remoteFolder}/_folders`);
        const exists = data !== null && data !== undefined;
        res.json({ exists: exists, remoteFolder: remoteFolder, canCreate: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/sync/status', (req, res) => {
    const folders = {};
    Object.keys(syncState.activeSyncs).forEach(key => {
        const active = syncState.activeSyncs[key];
        folders[key] = {
            localFolder: active.localFolder,
            status: active.status || 'idle',
            files: active.files || 0,
            synced: active.synced || 0,
            progress: active.progress || 0
        };
    });
    res.json({
        running: syncState.running,
        folders: folders,
        server: true,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/sync/start', async (req, res) => {
    let { localFolder, remoteFolder } = req.body;
    
    if (!localFolder) {
        return res.status(400).json({ error: 'Carpeta local no especificada' });
    }
    
    localFolder = normalizePath(localFolder);
    console.log(`📂 Carpeta local normalizada: ${localFolder}`);
    
    if (!remoteFolder) {
        remoteFolder = path.basename(localFolder).toLowerCase().replace(/\s+/g, '_');
    }
    
    if (!remoteFolder.match(/^[a-zA-Z0-9_\-]+$/)) {
        return res.status(400).json({
            error: 'Nombre de carpeta remota inválido. Solo letras, números, guiones y guión bajo.'
        });
    }
    
    const folderResult = ensureFolder(localFolder);
    
    // Verificar si ya está sincronizando esta carpeta
    if (syncState.activeSyncs[remoteFolder] && syncState.activeSyncs[remoteFolder].status === 'syncing') {
        return res.json({
            running: true,
            folder: remoteFolder,
            message: 'Ya está sincronizando esta carpeta'
        });
    }
    
    try {
        // Detener watcher anterior para esta carpeta si existe
        if (syncState.activeSyncs[remoteFolder] && syncState.activeSyncs[remoteFolder].watcher) {
            syncState.activeSyncs[remoteFolder].watcher.close();
        }
        
        // Inicializar estado para esta carpeta
        syncState.activeSyncs[remoteFolder] = {
            localFolder: folderResult.path,
            remoteFolder: remoteFolder,
            status: 'syncing',
            files: 0,
            synced: 0,
            progress: 0,
            watcher: null
        };
        
        syncState.running = true;
        
        // Sincronización inicial
        const result = await syncFolder(folderResult.path, remoteFolder);
        
        // Actualizar estado
        syncState.activeSyncs[remoteFolder].files = result.total;
        syncState.activeSyncs[remoteFolder].synced = result.synced;
        syncState.activeSyncs[remoteFolder].progress = result.total > 0 ? Math.round((result.synced / result.total) * 100) : 100;
        syncState.activeSyncs[remoteFolder].status = result.synced === result.total ? 'completed' : 'syncing';
        
        // Iniciar watcher
        syncState.activeSyncs[remoteFolder].watcher = startWatcher(folderResult.path, remoteFolder);
        
        res.json({
            success: true,
            localFolder: folderResult.path,
            remoteFolder: remoteFolder,
            files: result.total,
            synced: result.synced,
            created: folderResult.created,
            errors: result.errors || 0,
            message: 'Sincronización iniciada'
        });
    } catch (error) {
        if (syncState.activeSyncs[remoteFolder]) {
            syncState.activeSyncs[remoteFolder].status = 'error';
        }
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
});

app.post('/api/sync/stop', (req, res) => {
    const { remoteFolder } = req.body;
    
    if (remoteFolder && syncState.activeSyncs[remoteFolder]) {
        if (syncState.activeSyncs[remoteFolder].watcher) {
            syncState.activeSyncs[remoteFolder].watcher.close();
            syncState.activeSyncs[remoteFolder].watcher = null;
        }
        syncState.activeSyncs[remoteFolder].status = 'stopped';
        res.json({ success: true, folder: remoteFolder, message: 'Sincronización detenida' });
    } else {
        // Detener todas
        Object.keys(syncState.activeSyncs).forEach(key => {
            if (syncState.activeSyncs[key].watcher) {
                syncState.activeSyncs[key].watcher.close();
                syncState.activeSyncs[key].watcher = null;
            }
            syncState.activeSyncs[key].status = 'stopped';
        });
        syncState.running = false;
        res.json({ success: true, message: 'Todas las sincronizaciones detenidas' });
    }
});

app.get('/api/sync/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    syncState.events.forEach(event => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    
    const client = { res };
    syncState.clients.push(client);
    
    req.on('close', () => {
        syncState.clients = syncState.clients.filter(c => c !== client);
    });
});

// ============================================================
//  INICIAR SERVIDOR
// ============================================================

function openBrowser(url) {
    const start = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    exec(`${start} ${url}`, (err) => {
        if (err) {
            console.log(`🌐 Abre manualmente: ${url}`);
        } else {
            console.log(`🌐 Navegador abierto: ${url}`);
        }
    });
}

const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔄 Sincronizador COMPLETO (Múltiples Carpetas)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 Abriendo: ${url}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📁 index.html: ${INDEX_PATH}`);
    console.log(`✅ Usa preset: ${CONFIG.UPLOAD_PRESET}`);
    console.log('✅ Soporte para múltiples carpetas');
    console.log('✅ Sube archivos a Cloudinary');
    console.log('✅ Guarda metadatos en Firebase');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    setTimeout(() => openBrowser(url), 1000);
});

process.on('SIGINT', () => {
    console.log('\n👋 Deteniendo servidor...');
    Object.keys(syncState.activeSyncs).forEach(key => {
        if (syncState.activeSyncs[key].watcher) {
            syncState.activeSyncs[key].watcher.close();
        }
    });
    server.close(() => {
        console.log('✅ Servidor detenido');
        process.exit(0);
    });
});

module.exports = { app, syncState };
