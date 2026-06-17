/**
 * verktyg.js - Avancerade verktyg för Delad Mapp Online
 * Förbättrad version med robust upptäckt av filval.
 */

(function() {
    // Vänta tills DOM är redo
    function redo(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    let verktygspanel = null;
    let panelSynlig = false;

    // Skapa den flytande panelen
    function skapaVerktygspanel() {
        if (document.getElementById('avanceradVerktygspanel')) return;

        const panelHTML = `
            <div id="avanceradVerktygspanel" style="position: fixed; bottom: 20px; right: 20px; width: 350px; background: #1e293b; border-radius: 20px; border: 1px solid #475569; box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 10000; backdrop-filter: blur(12px); transform: translateX(400px); opacity: 0; transition: all 0.3s ease; pointer-events: none;">
                <div style="padding: 12px 16px; background: #0f172a; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-toolbox" style="color: #3b82f6;"></i>
                        <span style="font-weight: 600;">Verktyg</span>
                        <span id="verktygMärke" style="background: #3b82f6; padding: 2px 8px; border-radius: 30px; font-size: 0.7rem;">0</span>
                    </div>
                    <button id="stängVerktygBtn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem;">&times;</button>
                </div>
                <div style="padding: 15px; max-height: 450px; overflow-y: auto;">
                    <!-- Verktyg för en fil -->
                    <div id="enkelVerktyg" style="display: none;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">📄 Vald fil</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                            <button class="verktyg-åtgärd" data-åtgärd="ladda-ner-enkel"><i class="fas fa-download"></i> Ladda ner</button>
                            <button class="verktyg-åtgärd" data-åtgärd="byt-namn-enkel"><i class="fas fa-edit"></i> Byt namn</button>
                            <button class="verktyg-åtgärd" data-åtgärd="ta-bort-enkel"><i class="fas fa-trash"></i> Ta bort</button>
                            <button class="verktyg-åtgärd" data-åtgärd="detaljer"><i class="fas fa-info-circle"></i> Detaljer</button>
                            <button class="verktyg-åtgärd" data-åtgärd="förhandsgranska"><i class="fas fa-eye"></i> Förhandsgranska</button>
                            <button class="verktyg-åtgärd" data-åtgärd="kopiera-namn"><i class="fas fa-copy"></i> Kopiera namn</button>
                            <button class="verktyg-åtgärd" data-åtgärd="kopiera-länk"><i class="fas fa-link"></i> Kopiera länk</button>
                            <button class="verktyg-åtgärd" data-åtgärd="dela"><i class="fas fa-share-alt"></i> Dela</button>
                            <button class="verktyg-åtgärd" data-åtgärd="qrkod"><i class="fas fa-qrcode"></i> QR</button>
                        </div>
                    </div>
                    <!-- Verktyg för flera filer -->
                    <div id="fleraVerktyg" style="display: none;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">📦 <span id="fleraAntal">0</span> filer valda</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                            <button class="verktyg-åtgärd" data-åtgärd="ladda-ner-zip"><i class="fas fa-file-archive"></i> Ladda ner ZIP</button>
                            <button class="verktyg-åtgärd" data-åtgärd="ta-bort-flera"><i class="fas fa-trash"></i> Ta bort alla</button>
                            <button class="verktyg-åtgärd" data-åtgärd="kopiera-namn-flera"><i class="fas fa-copy"></i> Kopiera namn</button>
                            <button class="verktyg-åtgärd" data-åtgärd="flytta-mapp"><i class="fas fa-folder-move"></i> Flytta till...</button>
                            <button class="verktyg-åtgärd" data-åtgärd="välj-alla"><i class="fas fa-check-double"></i> Välj alla</button>
                            <button class="verktyg-åtgärd" data-åtgärd="rensa-val"><i class="fas fa-times-circle"></i> Rensa val</button>
                            <button class="verktyg-åtgärd" data-åtgärd="detaljer-flera"><i class="fas fa-chart-simple"></i> Sammanfattning</button>
                        </div>
                    </div>
                    <!-- Gemensamma verktyg -->
                    <div style="border-top: 1px solid #334155; padding-top: 15px;">
                        <div style="font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">⚡ Allmänna</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            <button class="verktyg-åtgärd" data-åtgärd="uppdatera"><i class="fas fa-sync-alt"></i> Uppdatera</button>
                            <button class="verktyg-åtgärd" data-åtgärd="mappstatistik"><i class="fas fa-chart-bar"></i> Statistik</button>
                        </div>
                    </div>
                </div>
                <div style="padding: 8px; background: #0f172a; border-radius: 0 0 20px 20px; font-size: 0.65rem; text-align: center; color: #64748b;">
                    <i class="fas fa-lightbulb"></i> Välj filer med kryssrutorna
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = panelHTML;
        document.body.appendChild(div.firstElementChild);
        verktygspanel = document.getElementById('avanceradVerktygspanel');

        // Stäng panel
        document.getElementById('stängVerktygBtn').addEventListener('click', () => {
            if (verktygspanel) {
                verktygspanel.style.transform = 'translateX(400px)';
                verktygspanel.style.opacity = '0';
                verktygspanel.style.pointerEvents = 'none';
                panelSynlig = false;
            }
        });

        // Applicera grundläggande stilar på knappar (undvik konflikter)
        document.querySelectorAll('.verktyg-åtgärd').forEach(knapp => {
            knapp.style.background = '#0f172a';
            knapp.style.border = '1px solid #334155';
            knapp.style.padding = '6px 10px';
            knapp.style.borderRadius = '10px';
            knapp.style.color = 'white';
            knapp.style.cursor = 'pointer';
            knapp.style.display = 'inline-flex';
            knapp.style.alignItems = 'center';
            knapp.style.gap = '6px';
            knapp.style.fontSize = '0.75rem';
            knapp.addEventListener('click', (e) => {
                e.stopPropagation();
                const åtgärd = knapp.getAttribute('data-åtgärd');
                if (åtgärd) hanteraVerktygsÅtgärd(åtgärd);
            });
        });
    }

    function visaVerktygspanel() {
        if (!verktygspanel) return;
        verktygspanel.style.transform = 'translateX(0)';
        verktygspanel.style.opacity = '1';
        verktygspanel.style.pointerEvents = 'auto';
        panelSynlig = true;
    }

    function döljVerktygspanel() {
        if (!verktygspanel) return;
        verktygspanel.style.transform = 'translateX(400px)';
        verktygspanel.style.opacity = '0';
        verktygspanel.style.pointerEvents = 'none';
        panelSynlig = false;
    }

    function uppdateraVerktygspanel() {
        // Använd både selectedFiles och valdaFiler för kompatibilitet
        const selectedSet = window.selectedFiles || window.valdaFiler;
        if (!selectedSet) {
            console.warn('⚠️ Inga valda filer hittades');
            return;
        }
        const antal = selectedSet.size;
        const märke = document.getElementById('verktygMärke');
        if (märke) märke.textContent = antal;

        const enkelDiv = document.getElementById('enkelVerktyg');
        const fleraDiv = document.getElementById('fleraVerktyg');
        const fleraSpan = document.getElementById('fleraAntal');

        if (antal === 0) {
            döljVerktygspanel();
            return;
        }
        visaVerktygspanel();
        if (antal === 1) {
            if (enkelDiv) enkelDiv.style.display = 'block';
            if (fleraDiv) fleraDiv.style.display = 'none';
        } else {
            if (enkelDiv) enkelDiv.style.display = 'none';
            if (fleraDiv) fleraDiv.style.display = 'block';
            if (fleraSpan) fleraSpan.textContent = antal;
        }
    }

    // Bevaka förändringar i kryssrutor med MutationObserver (mer robust)
    function bevakaKryssrutor() {
        const filnät = document.getElementById('fileGrid');
        if (!filnät) {
            console.warn('⚠️ fileGrid hittades inte');
            return;
        }

        const observatör = new MutationObserver(() => {
            if (window.selectedFiles || window.valdaFiler) {
                uppdateraVerktygspanel();
            }
        });
        observatör.observe(filnät, { childList: true, subtree: true, attributes: true, attributeFilter: ['checked'] });

        // Lyssna även på klickhändelser på kryssrutor (delegering)
        document.body.addEventListener('change', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('checkbox')) {
                setTimeout(() => uppdateraVerktygspanel(), 10);
            }
        });
        
        // Lyssna på click-händelser för att fånga upp kryssrutor som klickas
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.classList && e.target.classList.contains('checkbox')) {
                setTimeout(() => uppdateraVerktygspanel(), 10);
            }
        });
        
        console.log('✅ Bevakning av kryssrutor aktiv');
    }

    // ==================== ÅTGÄRDER ====================
    async function hanteraVerktygsÅtgärd(åtgärd) {
        const selectedSet = window.selectedFiles || window.valdaFiler;
        const valdaId = selectedSet ? Array.from(selectedSet) : [];
        if (valdaId.length === 0 && !['uppdatera', 'mappstatistik', 'välj-alla'].includes(åtgärd)) {
            visaMeddelande('Inga filer är valda', true);
            return;
        }
        switch (åtgärd) {
            case 'ladda-ner-enkel': if (valdaId.length === 1) await laddaNerFilWrapper(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'byt-namn-enkel': if (valdaId.length === 1) bytNamnFilWrapper(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'ta-bort-enkel': if (valdaId.length === 1) taBortFilWrapper(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'ta-bort-flera': taBortFleraFiler(valdaId); break;
            case 'detaljer': if (valdaId.length === 1) visaFilDetaljer(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'detaljer-flera': visaFleraDetaljer(valdaId); break;
            case 'förhandsgranska': if (valdaId.length === 1) förhandsgranskaFil(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'kopiera-namn': if (valdaId.length === 1) kopieraFilNamn(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'kopiera-namn-flera': kopieraFleraNamn(valdaId); break;
            case 'kopiera-länk': if (valdaId.length === 1) kopieraFilLänk(valdaId[0]); else visaMeddelande('Välj en enda fil', true); break;
            case 'dela': if (valdaId.length === 1) delaFil(valdaId[0]); else delaFleraFiler(valdaId); break;
            case 'qrkod': if (valdaId.length === 1) genereraQR(valdaId[0]); else visaMeddelande('QR endast för en fil', true); break;
            case 'ladda-ner-zip': laddaNerSomZip(valdaId); break;
            case 'flytta-mapp': flyttaTillMapp(valdaId); break;
            case 'välj-alla': väljAllaFiler(); break;
            case 'rensa-val': rensaVal(); break;
            case 'uppdatera': if (window.laddaFiler) window.laddaFiler(); else if (window.loadFiles) window.loadFiles(); visaMeddelande('Listan uppdaterad'); break;
            case 'mappstatistik': visaMappStatistik(); break;
            default: console.warn('Okänd åtgärd:', åtgärd);
        }
    }

    // Hämta fil-array från window.allFiles eller window.allaFiler
    function hämtaAllaFiler() {
        return window.allFiles || window.allaFiler || [];
    }

    // Hämta currentFolder från window.currentFolder eller window.aktuellMapp
    function hämtaAktuellMapp() {
        return window.currentFolder || window.aktuellMapp || 'general';
    }

    // Wrappers som använder funktionerna från original-HTML
    async function laddaNerFilWrapper(filId) {
        if (window.laddaNerFil) await window.laddaNerFil(filId);
        else if (window.downloadFile) await window.downloadFile(filId);
        else {
            const filer = hämtaAllaFiler();
            const fil = filer.find(f => f.id === filId);
            if (fil && fil.url) {
                const a = document.createElement('a');
                a.href = fil.url;
                a.download = fil.filename;
                a.click();
                visaMeddelande(`Laddar ner: ${fil.filename}`);
            } else visaMeddelande('Kan inte ladda ner', true);
        }
    }
    function bytNamnFilWrapper(filId) { 
        if (window.bytNamnFilPrompt) window.bytNamnFilPrompt(filId); 
        else if (window.renameFilePrompt) window.renameFilePrompt(filId);
        else visaMeddelande('Byt namn inte tillgängligt', true); 
    }
    function taBortFilWrapper(filId) { 
        if (window.taBortEnkelFil) window.taBortEnkelFil(filId); 
        else if (window.deleteSingleFile) window.deleteSingleFile(filId);
        else if (confirm('Ta bort?')) {
            const mapp = hämtaAktuellMapp();
            window.database.ref(`shared_files/${mapp}/${filId}`).remove();
        } 
    }
    async function taBortFleraFiler(ids) { 
        if (confirm(`Ta bort ${ids.length} filer?`)) { 
            const mapp = hämtaAktuellMapp();
            for (const id of ids) await window.database.ref(`shared_files/${mapp}/${id}`).remove(); 
            const selectedSet = window.selectedFiles || window.valdaFiler;
            if (selectedSet) selectedSet.clear();
            if (window.laddaFiler) window.laddaFiler(); else if (window.loadFiles) window.loadFiles();
            visaMeddelande(`${ids.length} filer borttagna`); 
        } 
    }
    function visaFilDetaljer(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f => f.id === id); 
        if (!f) return; 
        visaModal('Detaljer', `<p><strong>Namn:</strong> ${escapetext(f.filename)}</p><p><strong>Storlek:</strong> ${formateraStorlekWrapper(f.size)}</p><p><strong>Datum:</strong> ${new Date(f.date).toLocaleString()}</p><p><strong>URL:</strong> <a href="${f.url}" target="_blank">Öppna</a></p>`); 
    }
    function visaFleraDetaljer(ids) { 
        const filer = hämtaAllaFiler();
        const valdaFiler = ids.map(id => filer.find(f => f.id === id)).filter(f => f); 
        const total = valdaFiler.reduce((s,f)=>s+(f.size||0),0); 
        let html = `<p><strong>${valdaFiler.length} filer</strong><br>Totalt: ${formateraStorlekWrapper(total)}</p><ul>`; 
        valdaFiler.forEach(f=>html+=`<li>${escapetext(f.filename)} (${formateraStorlekWrapper(f.size)})</li>`); 
        html+=`</ul>`; 
        visaModal('Sammanfattning', html); 
    }
    function förhandsgranskaFil(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f=>f.id===id); 
        if(!f)return; 
        const ext = f.filename.split('.').pop().toLowerCase(); 
        if(['jpg','jpeg','png','gif','webp','tif','tiff'].includes(ext)) 
            visaModal('Förhandsgranskning', `<img src="${f.url}" style="max-width:100%; max-height:60vh;">`); 
        else if(['mp4','webm','mov'].includes(ext)) 
            visaModal('Förhandsgranskning', `<video controls src="${f.url}" style="max-width:100%"></video>`); 
        else visaMeddelande('Förhandsgranskning ej tillgänglig', true); 
    }
    function kopieraFilNamn(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f=>f.id===id); 
        if(f){ kopieraTillUrklipp(f.filename); visaMeddelande(`Namn kopierat: ${f.filename}`); } 
    }
    function kopieraFleraNamn(ids) { 
        const filer = hämtaAllaFiler();
        const valdaFiler = ids.map(id=>filer.find(f=>f.id===id)).filter(f=>f); 
        const namn = valdaFiler.map(f=>f.filename).join('\n'); 
        kopieraTillUrklipp(namn); 
        visaMeddelande(`${valdaFiler.length} namn kopierade`); 
    }
    function kopieraFilLänk(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f=>f.id===id); 
        if(f){ kopieraTillUrklipp(f.url); visaMeddelande('Länk kopierad'); } 
    }
    async function delaFil(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f=>f.id===id); 
        if(f){ 
            if(navigator.share) try{ await navigator.share({title:f.filename, url:f.url}); }
            catch(e){ kopieraTillUrklipp(f.url); visaMeddelande('Länk kopierad'); } 
            else { kopieraTillUrklipp(f.url); visaMeddelande('Länk kopierad'); } 
        } 
    }
    function delaFleraFiler(ids) { 
        const filer = hämtaAllaFiler();
        const valdaFiler = ids.map(id=>filer.find(f=>f.id===id)).filter(f=>f); 
        kopieraTillUrklipp(valdaFiler.map(f=>f.filename).join(', ')); 
        visaMeddelande('Lista med namn kopierad'); 
    }
    function genereraQR(id) { 
        const filer = hämtaAllaFiler();
        const f = filer.find(f=>f.id===id); 
        if(!f)return; 
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(f.url)}`; 
        visaModal('QR-kod', `<div style="text-align:center"><img src="${qrUrl}" style="background:white;padding:10px;border-radius:12px;"><p>${escapetext(f.filename)}</p></div>`); 
    }
    async function laddaNerSomZip(ids) { 
        if(!ids.length)return; 
        visaMeddelande('Förbereder ZIP...'); 
        if(typeof JSZip==='undefined'){ 
            const s=document.createElement('script'); 
            s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; 
            s.onload=()=>utförZip(ids); 
            document.head.appendChild(s); 
        } else utförZip(ids); 
    }
    async function utförZip(ids) { 
        const filer = hämtaAllaFiler();
        const valdaFiler = ids.map(id=>filer.find(f=>f.id===id)).filter(f=>f); 
        const zip=new JSZip(); 
        for(const f of valdaFiler){ 
            try{ 
                const svar=await fetch(f.url); 
                const blob=await svar.blob(); 
                zip.file(f.filename, blob); 
            }catch(e){} 
        } 
        const innehåll=await zip.generateAsync({type:'blob'}); 
        const a=document.createElement('a'); 
        a.href=URL.createObjectURL(innehåll); 
        a.download=`filer_${Date.now()}.zip`; 
        a.click(); 
        URL.revokeObjectURL(a.href); 
        visaMeddelande('ZIP nedladdad'); 
    }
    function flyttaTillMapp(ids) { 
        const mappar = [{nyckel:'general',namn:'Allmän'},{nyckel:'documentos',namn:'Dokument'},{nyckel:'imagenes',namn:'Bilder'},{nyckel:'videos',namn:'Videor'},{nyckel:'otros',namn:'Övrigt'}]; 
        if(window.anpassadeMappar || window.customFolders) {
            const folders = window.customFolders || window.anpassadeMappar;
            if(folders) Array.from(folders).forEach(c=>mappar.push({nyckel:c,namn:c}));
        }
        let alternativ=''; 
        mappar.forEach(m=>alternativ+=`<option value="${m.nyckel}">${escapetext(m.namn)}</option>`); 
        const modalInnehåll=`<p>Flytta ${ids.length} fil(er) till:</p><select id="målMappVälj" style="width:100%; padding:8px; margin:12px 0;">${alternativ}</select><div style="display:flex; gap:10px;"><button id="avbrytFlyttaBtn">Avbryt</button><button id="bekräftaFlyttaBtn">Flytta</button></div>`; 
        const modal=visaModal('Flytta filer', modalInnehåll, false); 
        document.getElementById('bekräftaFlyttaBtn').addEventListener('click', async()=>{ 
            const mål=document.getElementById('målMappVälj').value; 
            if(!mål)return;
            const filer = hämtaAllaFiler();
            const mapp = hämtaAktuellMapp();
            for(const id of ids){ 
                const fil=filer.find(f=>f.id===id); 
                if(fil){ 
                    const kopia={...fil, folder:mål}; 
                    delete kopia.id; 
                    await window.database.ref(`shared_files/${mål}`).push(kopia); 
                    await window.database.ref(`shared_files/${mapp}/${id}`).remove(); 
                } 
            } 
            modal.remove(); 
            if(window.overlay)window.overlay.remove(); 
            visaMeddelande(`${ids.length} fil(er) flyttade till ${mål}`); 
            if(window.laddaFiler)window.laddaFiler(); else if(window.loadFiles)window.loadFiles();
            const selectedSet = window.selectedFiles || window.valdaFiler;
            if(selectedSet) selectedSet.clear(); 
            uppdateraVerktygspanel(); 
        }); 
        document.getElementById('avbrytFlyttaBtn').addEventListener('click',()=>{ 
            modal.remove(); 
            if(window.overlay)window.overlay.remove(); 
        }); 
    }
    function väljAllaFiler() { 
        const filer = hämtaAllaFiler();
        if(filer.length > 0){ 
            const selectedSet = window.selectedFiles || window.valdaFiler;
            if(selectedSet) {
                selectedSet.clear(); 
                filer.forEach(f=>selectedSet.add(f.id)); 
                if(window.renderFiles)window.renderFiles(); 
                uppdateraVerktygspanel(); 
                visaMeddelande(`${filer.length} filer valda`);
            }
        } 
    }
    function rensaVal() { 
        const selectedSet = window.selectedFiles || window.valdaFiler;
        if(selectedSet) {
            selectedSet.clear(); 
            if(window.renderFiles)window.renderFiles(); 
            uppdateraVerktygspanel(); 
            visaMeddelande('Val rensat');
        }
    }
    function visaMappStatistik() { 
        const filer = hämtaAllaFiler();
        const mapp = hämtaAktuellMapp();
        const total = filer.reduce((s,f)=>s+(f.size||0),0); 
        const typer={}; 
        filer.forEach(f=>{ 
            const ext=f.filename.split('.').pop().toLowerCase()||'ingen ändelse'; 
            typer[ext]=(typer[ext]||0)+1; 
        }); 
        let html=`<p>📁 Mapp: ${mapp}</p><p>📄 Totalt: ${filer.length}</p><p>💾 Storlek: ${formateraStorlekWrapper(total)}</p><p>📊 Typer:</p><ul>`; 
        Object.entries(typer).slice(0,15).forEach(([e,a])=>html+=`<li>${e}: ${a}</li>`); 
        html+=`</ul>`; 
        visaModal('Statistik', html); 
    }

    // Hjälpfunktioner
    function escapetext(s) { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
    function formateraStorlekWrapper(b){ if(!b)return '0 B'; const s=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return parseFloat((b/Math.pow(1024,i)).toFixed(2))+' '+s[i]; }
    function kopieraTillUrklipp(t){ navigator.clipboard.writeText(t).catch(()=>{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }); }
    function visaMeddelande(medd, ärFel=false){ 
        if(window.visaMeddelande) window.visaMeddelande(medd, ärFel); 
        else if(window.showToast) window.showToast(medd, ärFel);
        else alert(medd); 
    }
    let aktivModal=null, overlay=null;
    function visaModal(titel, innehåll, autoStäng=true){ 
        if(aktivModal){ aktivModal.remove(); if(overlay)overlay.remove(); } 
        overlay=document.createElement('div'); 
        overlay.style.position='fixed'; 
        overlay.style.top='0'; 
        overlay.style.left='0'; 
        overlay.style.right='0'; 
        overlay.style.bottom='0'; 
        overlay.style.background='rgba(0,0,0,0.7)'; 
        overlay.style.zIndex='11000'; 
        document.body.appendChild(overlay); 
        const modal=document.createElement('div'); 
        modal.style.position='fixed'; 
        modal.style.top='50%'; 
        modal.style.left='50%'; 
        modal.style.transform='translate(-50%, -50%)'; 
        modal.style.background='#1e293b'; 
        modal.style.borderRadius='20px'; 
        modal.style.padding='20px'; 
        modal.style.zIndex='11001'; 
        modal.style.minWidth='280px'; 
        modal.style.maxWidth='450px'; 
        modal.style.border='1px solid #475569'; 
        modal.innerHTML=`<h3 style="margin-bottom:12px;color:#60a5fa;">${escapetext(titel)}</h3><div>${innehåll}</div><button id="modalStängBtn" style="margin-top:16px; background:#3b82f6; border:none; padding:6px 12px; border-radius:8px; color:white;">Stäng</button>`; 
        document.body.appendChild(modal); 
        aktivModal=modal; 
        const stäng=()=>{ modal.remove(); overlay.remove(); aktivModal=null; }; 
        document.getElementById('modalStängBtn').addEventListener('click', stäng); 
        if(autoStäng) overlay.addEventListener('click', stäng); 
        return modal; 
    }

    // Initiering
    redo(() => {
        skapaVerktygspanel();
        
        // Vänta på att selectedFiles ska vara definierad
        let försök = 0;
        const kontrollIntervall = setInterval(() => {
            försök++;
            const harSelected = (window.selectedFiles !== undefined) || (window.valdaFiler !== undefined);
            const harDatabase = window.database !== undefined;
            const harFiler = (window.allFiles !== undefined) || (window.allaFiler !== undefined);
            
            if (harSelected && harDatabase && harFiler) {
                clearInterval(kontrollIntervall);
                // Synkronisera valdaFiler med selectedFiles
                if (window.selectedFiles && !window.valdaFiler) {
                    window.valdaFiler = window.selectedFiles;
                } else if (window.valdaFiler && !window.selectedFiles) {
                    window.selectedFiles = window.valdaFiler;
                }
                bevakaKryssrutor();
                setTimeout(uppdateraVerktygspanel, 100);
                console.log('✅ verktyg.js initierad korrekt');
            } else if (försök > 25) { // 5 sekunder
                clearInterval(kontrollIntervall);
                console.warn('⚠️ verktyg.js: Kunde inte hitta alla nödvändiga variabler');
                // Försök med fallback
                if (typeof selectedFiles !== 'undefined' && !window.selectedFiles) {
                    window.selectedFiles = selectedFiles;
                    window.valdaFiler = selectedFiles;
                }
                if (typeof allFiles !== 'undefined' && !window.allFiles) {
                    window.allFiles = allFiles;
                    window.allaFiler = allFiles;
                }
                if (typeof currentFolder !== 'undefined' && !window.currentFolder) {
                    window.currentFolder = currentFolder;
                    window.aktuellMapp = currentFolder;
                }
                if (typeof database !== 'undefined' && !window.database) {
                    window.database = database;
                }
                if (typeof showToast !== 'undefined' && !window.showToast) {
                    window.showToast = showToast;
                    window.visaMeddelande = showToast;
                }
                bevakaKryssrutor();
                setTimeout(uppdateraVerktygspanel, 200);
            }
        }, 200);
    });
})();
