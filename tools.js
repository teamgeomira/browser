/**
 * tools.js - Herramientas avanzadas para la Carpeta Compartida Online
 * Versión mejorada con detección robusta de selección de archivos.
 */

(function() {
    // Esperar a que el DOM esté listo
    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    let toolsPanel = null;
    let panelVisible = false;

    // Crear el panel flotante
    function createToolsPanel() {
        if (document.getElementById('advancedToolsPanel')) return;

        const panelHTML = `
            <div id="advancedToolsPanel" style="position: fixed; bottom: 20px; right: 20px; width: 350px; background: #1e293b; border-radius: 20px; border: 1px solid #475569; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 10000; backdrop-filter: blur(12px); transform: translateX(400px); opacity: 0; transition: all 0.3s ease; pointer-events: none;">
                <div style="padding: 12px 16px; background: #0f172a; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-toolbox" style="color: #3b82f6;"></i>
                        <span style="font-weight: 600;">Herramientas</span>
                        <span id="toolsBadge" style="background: #3b82f6; padding: 2px 8px; border-radius: 30px; font-size: 0.7rem;">0</span>
                    </div>
                    <button id="closeToolsBtn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem;">&times;</button>
                </div>
                <div style="padding: 15px; max-height: 450px; overflow-y: auto;">
                    <!-- Herramientas para un archivo -->
                    <div id="singleTools" style="display: none;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">📄 Archivo seleccionado</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                            <button class="tool-action" data-action="download-single"><i class="fas fa-download"></i> Descargar</button>
                            <button class="tool-action" data-action="rename-single"><i class="fas fa-edit"></i> Renombrar</button>
                            <button class="tool-action" data-action="delete-single"><i class="fas fa-trash"></i> Eliminar</button>
                            <button class="tool-action" data-action="details"><i class="fas fa-info-circle"></i> Detalles</button>
                            <button class="tool-action" data-action="preview"><i class="fas fa-eye"></i> Vista previa</button>
                            <button class="tool-action" data-action="copy-name"><i class="fas fa-copy"></i> Copiar nombre</button>
                            <button class="tool-action" data-action="copy-link"><i class="fas fa-link"></i> Copiar enlace</button>
                            <button class="tool-action" data-action="share"><i class="fas fa-share-alt"></i> Compartir</button>
                            <button class="tool-action" data-action="qrcode"><i class="fas fa-qrcode"></i> QR</button>
                        </div>
                    </div>
                    <!-- Herramientas para múltiples archivos -->
                    <div id="multiTools" style="display: none;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">📦 <span id="multiCount">0</span> archivos seleccionados</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                            <button class="tool-action" data-action="download-zip"><i class="fas fa-file-archive"></i> Descargar ZIP</button>
                            <button class="tool-action" data-action="delete-multi"><i class="fas fa-trash"></i> Eliminar todos</button>
                            <button class="tool-action" data-action="copy-names"><i class="fas fa-copy"></i> Copiar nombres</button>
                            <button class="tool-action" data-action="move-folder"><i class="fas fa-folder-move"></i> Mover a...</button>
                            <button class="tool-action" data-action="select-all"><i class="fas fa-check-double"></i> Seleccionar todo</button>
                            <button class="tool-action" data-action="clear-selection"><i class="fas fa-times-circle"></i> Limpiar selección</button>
                            <button class="tool-action" data-action="details-multi"><i class="fas fa-chart-simple"></i> Resumen</button>
                        </div>
                    </div>
                    <!-- Herramientas comunes -->
                    <div style="border-top: 1px solid #334155; padding-top: 15px;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">⚡ Generales</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <button class="tool-action" data-action="refresh"><i class="fas fa-sync-alt"></i> Refrescar</button>
                            <button class="tool-action" data-action="folder-stats"><i class="fas fa-chart-bar"></i> Estadísticas</button>
                        </div>
                    </div>
                </div>
                <div style="padding: 8px; background: #0f172a; border-radius: 0 0 20px 20px; font-size: 0.65rem; text-align: center; color: #64748b;">
                    <i class="fas fa-lightbulb"></i> Selecciona archivos con los checkboxes
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = panelHTML;
        document.body.appendChild(div.firstElementChild);
        toolsPanel = document.getElementById('advancedToolsPanel');

        // Cerrar panel
        document.getElementById('closeToolsBtn').addEventListener('click', () => {
            if (toolsPanel) {
                toolsPanel.style.transform = 'translateX(400px)';
                toolsPanel.style.opacity = '0';
                toolsPanel.style.pointerEvents = 'none';
                panelVisible = false;
            }
        });

        // Aplicar estilos básicos a los botones (evitar conflictos)
        document.querySelectorAll('.tool-action').forEach(btn => {
            btn.style.background = '#0f172a';
            btn.style.border = '1px solid #334155';
            btn.style.padding = '6px 10px';
            btn.style.borderRadius = '10px';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';
            btn.style.display = 'inline-flex';
            btn.style.alignItems = 'center';
            btn.style.gap = '6px';
            btn.style.fontSize = '0.75rem';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                if (action) handleToolAction(action);
            });
        });
    }

    function showToolsPanel() {
        if (!toolsPanel) return;
        toolsPanel.style.transform = 'translateX(0)';
        toolsPanel.style.opacity = '1';
        toolsPanel.style.pointerEvents = 'auto';
        panelVisible = true;
    }

    function hideToolsPanel() {
        if (!toolsPanel) return;
        toolsPanel.style.transform = 'translateX(400px)';
        toolsPanel.style.opacity = '0';
        toolsPanel.style.pointerEvents = 'none';
        panelVisible = false;
    }

    function updateToolsPanel() {
        if (!window.selectedFiles) return;
        const count = window.selectedFiles.size;
        const badge = document.getElementById('toolsBadge');
        if (badge) badge.textContent = count;

        const singleDiv = document.getElementById('singleTools');
        const multiDiv = document.getElementById('multiTools');
        const multiSpan = document.getElementById('multiCount');

        if (count === 0) {
            hideToolsPanel();
            return;
        }
        showToolsPanel();
        if (count === 1) {
            if (singleDiv) singleDiv.style.display = 'block';
            if (multiDiv) multiDiv.style.display = 'none';
        } else {
            if (singleDiv) singleDiv.style.display = 'none';
            if (multiDiv) multiDiv.style.display = 'block';
            if (multiSpan) multiSpan.textContent = count;
        }
    }

    // Observar cambios en checkboxes usando MutationObserver (más robusto)
    function observeCheckboxes() {
        const fileGrid = document.getElementById('fileGrid');
        if (!fileGrid) return;

        const observer = new MutationObserver(() => {
            // Re-evaluate selection after DOM changes (renderFiles actualiza los checkboxes)
            if (window.selectedFiles) {
                updateToolsPanel();
            }
        });
        observer.observe(fileGrid, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked'] });

        // También escuchar eventos click en los checkboxes (delegación)
        document.body.addEventListener('change', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('checkbox')) {
                setTimeout(() => updateToolsPanel(), 10);
            }
        });
    }

    // ==================== ACCIONES ====================
    async function handleToolAction(action) {
        const selectedIds = window.selectedFiles ? Array.from(window.selectedFiles) : [];
        if (selectedIds.length === 0 && !['refresh', 'folder-stats', 'select-all'].includes(action)) {
            showToastMsg('No hay archivos seleccionados', true);
            return;
        }
        switch (action) {
            case 'download-single': if (selectedIds.length === 1) await downloadFileWrapper(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'rename-single': if (selectedIds.length === 1) renameFileWrapper(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'delete-single': if (selectedIds.length === 1) deleteFileWrapper(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'delete-multi': deleteMultipleFiles(selectedIds); break;
            case 'details': if (selectedIds.length === 1) showFileDetails(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'details-multi': showMultipleDetails(selectedIds); break;
            case 'preview': if (selectedIds.length === 1) previewFile(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'copy-name': if (selectedIds.length === 1) copyFileName(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'copy-names': copyMultipleNames(selectedIds); break;
            case 'copy-link': if (selectedIds.length === 1) copyFileLink(selectedIds[0]); else showToastMsg('Selecciona un solo archivo', true); break;
            case 'share': if (selectedIds.length === 1) shareFile(selectedIds[0]); else shareMultipleFiles(selectedIds); break;
            case 'qrcode': if (selectedIds.length === 1) generateQR(selectedIds[0]); else showToastMsg('QR solo para un archivo', true); break;
            case 'download-zip': downloadAsZip(selectedIds); break;
            case 'move-folder': moveToFolder(selectedIds); break;
            case 'select-all': selectAllFiles(); break;
            case 'clear-selection': clearSelection(); break;
            case 'refresh': if (window.loadFiles) window.loadFiles(); showToastMsg('Lista actualizada'); break;
            case 'folder-stats': showFolderStats(); break;
            default: console.warn('Acción desconocida:', action);
        }
    }

    // Wrappers que usan las funciones del HTML original
    async function downloadFileWrapper(fileId) {
        if (window.downloadFile) await window.downloadFile(fileId);
        else {
            const file = window.allFiles?.find(f => f.id === fileId);
            if (file && file.url) {
                const a = document.createElement('a');
                a.href = file.url;
                a.download = file.filename;
                a.click();
                showToastMsg(`Descargando: ${file.filename}`);
            } else showToastMsg('No se puede descargar', true);
        }
    }
    function renameFileWrapper(fileId) { if (window.renameFilePrompt) window.renameFilePrompt(fileId); else showToastMsg('Renombrar no disponible', true); }
    function deleteFileWrapper(fileId) { if (window.deleteSingleFile) window.deleteSingleFile(fileId); else if (confirm('Eliminar?')) window.database.ref(`shared_files/${window.currentFolder}/${fileId}`).remove(); }
    async function deleteMultipleFiles(ids) { if (confirm(`Eliminar ${ids.length} archivos?`)) { for (const id of ids) await window.database.ref(`shared_files/${window.currentFolder}/${id}`).remove(); window.selectedFiles.clear(); if (window.loadFiles) window.loadFiles(); showToastMsg(`${ids.length} archivos eliminados`); } }
    function showFileDetails(id) { const f = window.allFiles?.find(f => f.id === id); if (!f) return; showModal('Detalles', `<p><strong>Nombre:</strong> ${escapeHtml(f.filename)}</p><p><strong>Tamaño:</strong> ${formatSizeWrapper(f.size)}</p><p><strong>Fecha:</strong> ${new Date(f.date).toLocaleString()}</p><p><strong>URL:</strong> <a href="${f.url}" target="_blank">Abrir</a></p>`); }
    function showMultipleDetails(ids) { const files = ids.map(id => window.allFiles?.find(f => f.id === id)).filter(f => f); const total = files.reduce((s,f)=>s+(f.size||0),0); let html = `<p><strong>${files.length} archivos</strong><br>Total: ${formatSizeWrapper(total)}</p><ul>`; files.forEach(f=>html+=`<li>${escapeHtml(f.filename)} (${formatSizeWrapper(f.size)})</li>`); html+=`</ul>`; showModal('Resumen', html); }
    function previewFile(id) { const f = window.allFiles?.find(f=>f.id===id); if(!f)return; const ext = f.filename.split('.').pop().toLowerCase(); if(['jpg','jpeg','png','gif','webp','tif','tiff'].includes(ext)) showModal('Vista previa', `<img src="${f.url}" style="max-width:100%; max-height:60vh;">`); else if(['mp4','webm','mov'].includes(ext)) showModal('Vista previa', `<video controls src="${f.url}" style="max-width:100%"></video>`); else showToastMsg('Vista previa no disponible', true); }
    function copyFileName(id) { const f = window.allFiles?.find(f=>f.id===id); if(f){ copyToClip(f.filename); showToastMsg(`Nombre copiado: ${f.filename}`); } }
    function copyMultipleNames(ids) { const files = ids.map(id=>window.allFiles?.find(f=>f.id===id)).filter(f=>f); const names = files.map(f=>f.filename).join('\n'); copyToClip(names); showToastMsg(`${files.length} nombres copiados`); }
    function copyFileLink(id) { const f = window.allFiles?.find(f=>f.id===id); if(f){ copyToClip(f.url); showToastMsg('Enlace copiado'); } }
    async function shareFile(id) { const f = window.allFiles?.find(f=>f.id===id); if(f){ if(navigator.share) try{ await navigator.share({title:f.filename, url:f.url}); }catch(e){ copyToClip(f.url); showToastMsg('Enlace copiado'); } else { copyToClip(f.url); showToastMsg('Enlace copiado'); } } }
    function shareMultipleFiles(ids) { const files = ids.map(id=>window.allFiles?.find(f=>f.id===id)).filter(f=>f); copyToClip(files.map(f=>f.filename).join(', ')); showToastMsg('Lista de nombres copiada'); }
    function generateQR(id) { const f = window.allFiles?.find(f=>f.id===id); if(!f)return; const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(f.url)}`; showModal('Código QR', `<div style="text-align:center"><img src="${qrUrl}" style="background:white;padding:10px;border-radius:12px;"><p>${escapeHtml(f.filename)}</p></div>`); }
    async function downloadAsZip(ids) { if(!ids.length)return; showToastMsg('Preparando ZIP...'); if(typeof JSZip==='undefined'){ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.onload=()=>performZip(ids); document.head.appendChild(s); } else performZip(ids); }
    async function performZip(ids) { const files = ids.map(id=>window.allFiles?.find(f=>f.id===id)).filter(f=>f); const zip=new JSZip(); for(const f of files){ try{ const resp=await fetch(f.url); const blob=await resp.blob(); zip.file(f.filename, blob); }catch(e){} } const content=await zip.generateAsync({type:'blob'}); const a=document.createElement('a'); a.href=URL.createObjectURL(content); a.download=`archivos_${Date.now()}.zip`; a.click(); URL.revokeObjectURL(a.href); showToastMsg('ZIP descargado'); }
    function moveToFolder(ids) { const folders = [{key:'general',name:'General'},{key:'documentos',name:'Documentos'},{key:'imagenes',name:'Imágenes'},{key:'videos',name:'Videos'},{key:'otros',name:'Otros'}]; if(window.customFolders) Array.from(window.customFolders).forEach(c=>folders.push({key:c,name:c})); let options=''; folders.forEach(f=>options+=`<option value="${f.key}">${escapeHtml(f.name)}</option>`); const modalContent=`<p>Mover ${ids.length} archivo(s) a:</p><select id="targetFolderSelect" style="width:100%; padding:8px; margin:12px 0;">${options}</select><div style="display:flex; gap:10px;"><button id="cancelMoveBtn">Cancelar</button><button id="confirmMoveBtn">Mover</button></div>`; const modal=showModal('Mover archivos', modalContent, false); document.getElementById('confirmMoveBtn').addEventListener('click', async()=>{ const target=document.getElementById('targetFolderSelect').value; if(!target)return; for(const id of ids){ const file=window.allFiles.find(f=>f.id===id); if(file){ const copy={...file, folder:target}; delete copy.id; await window.database.ref(`shared_files/${target}`).push(copy); await window.database.ref(`shared_files/${window.currentFolder}/${id}`).remove(); } } modal.remove(); if(window.overlay)window.overlay.remove(); showToastMsg(`${ids.length} archivo(s) movidos a ${target}`); if(window.loadFiles)window.loadFiles(); window.selectedFiles.clear(); updateToolsPanel(); }); document.getElementById('cancelMoveBtn').addEventListener('click',()=>{ modal.remove(); if(window.overlay)window.overlay.remove(); }); }
    function selectAllFiles() { if(window.allFiles){ window.selectedFiles.clear(); window.allFiles.forEach(f=>window.selectedFiles.add(f.id)); if(window.renderFiles)window.renderFiles(); updateToolsPanel(); showToastMsg(`Seleccionados ${window.allFiles.length} archivos`); } }
    function clearSelection() { window.selectedFiles.clear(); if(window.renderFiles)window.renderFiles(); updateToolsPanel(); showToastMsg('Selección limpiada'); }
    function showFolderStats() { const files=window.allFiles||[]; const total=files.reduce((s,f)=>s+(f.size||0),0); const types={}; files.forEach(f=>{ const ext=f.filename.split('.').pop().toLowerCase()||'sin extensión'; types[ext]=(types[ext]||0)+1; }); let html=`<p>📁 Carpeta: ${window.currentFolder}</p><p>📄 Total: ${files.length}</p><p>💾 Tamaño: ${formatSizeWrapper(total)}</p><p>📊 Tipos:</p><ul>`; Object.entries(types).slice(0,15).forEach(([e,c])=>html+=`<li>${e}: ${c}</li>`); html+=`</ul>`; showModal('Estadísticas', html); }

    // Utilidades
    function escapeHtml(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
    function formatSizeWrapper(b){ if(!b)return '0 B'; const s=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return parseFloat((b/Math.pow(1024,i)).toFixed(2))+' '+s[i]; }
    function copyToClip(t){ navigator.clipboard.writeText(t).catch(()=>{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }); }
    function showToastMsg(msg, isErr=false){ if(window.showToast) window.showToast(msg, isErr); else alert(msg); }
    let activeModal=null, overlay=null;
    function showModal(title, content, autoClose=true){ if(activeModal){ activeModal.remove(); if(overlay)overlay.remove(); } overlay=document.createElement('div'); overlay.style.position='fixed'; overlay.style.top='0'; overlay.style.left='0'; overlay.style.right='0'; overlay.style.bottom='0'; overlay.style.background='rgba(0,0,0,0.7)'; overlay.style.zIndex='11000'; document.body.appendChild(overlay); const modal=document.createElement('div'); modal.style.position='fixed'; modal.style.top='50%'; modal.style.left='50%'; modal.style.transform='translate(-50%, -50%)'; modal.style.background='#1e293b'; modal.style.borderRadius='20px'; modal.style.padding='20px'; modal.style.zIndex='11001'; modal.style.minWidth='280px'; modal.style.maxWidth='450px'; modal.style.border='1px solid #475569'; modal.innerHTML=`<h3 style="margin-bottom:12px;color:#60a5fa;">${escapeHtml(title)}</h3><div>${content}</div><button id="modalCloseBtn" style="margin-top:16px; background:#3b82f6; border:none; padding:6px 12px; border-radius:8px; color:white;">Stäng</button>`; document.body.appendChild(modal); activeModal=modal; const close=()=>{ modal.remove(); overlay.remove(); activeModal=null; }; document.getElementById('modalCloseBtn').addEventListener('click', close); if(autoClose) overlay.addEventListener('click', close); return modal; }

    // Inicialización
    ready(() => {
        createToolsPanel();
        // Esperar a que window.selectedFiles esté definido (el script principal ya se ejecutó)
        const checkInterval = setInterval(() => {
            if (window.selectedFiles !== undefined && window.database && window.allFiles !== undefined) {
                clearInterval(checkInterval);
                observeCheckboxes();
                updateToolsPanel();
                console.log('✅ tools.js inicializado correctamente');
            }
        }, 200);
        // Fallback después de 5 segundos
        setTimeout(() => {
            if (window.selectedFiles === undefined) {
                console.warn('⚠️ tools.js: window.selectedFiles no encontrado, reintentando...');
                if (typeof selectedFiles !== 'undefined') window.selectedFiles = selectedFiles;
                if (typeof database !== 'undefined') window.database = database;
                if (typeof allFiles !== 'undefined') window.allFiles = allFiles;
                if (typeof currentFolder !== 'undefined') window.currentFolder = currentFolder;
                if (typeof showToast !== 'undefined') window.showToast = showToast;
                observeCheckboxes();
                updateToolsPanel();
            }
        }, 3000);
    });
})();