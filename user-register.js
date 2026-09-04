/**
 * user-register.js - Användarregistrering för filuppladdning
 * Visar ett litet formulär vid första besöket för att registrera användarens namn.
 * Sparas i localStorage för att fungera i alla webbläsare (Chrome, Edge, Firefox, etc.)
 * Används sedan för att märka uppladdade filer med användarens namn.
 */

(function() {
    // Nyckel för localStorage
    const STORAGE_KEY = 'shared_folder_user_data';
    
    // Standardanvändare om ingen är registrerad
    let currentUser = null;
    
    // DOM-element för modalen
    let userModal = null;
    let isModalVisible = false;

    // Hämta användardata från localStorage
    function getUserData() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Kunde inte läsa användardata från localStorage', e);
        }
        return null;
    }

    // Spara användardata i localStorage
    function saveUserData(userData) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
            currentUser = userData;
            return true;
        } catch (e) {
            console.warn('Kunde inte spara användardata i localStorage', e);
            return false;
        }
    }

    // Kontrollera om användaren redan är registrerad
    function isUserRegistered() {
        return getUserData() !== null;
    }

    // Hämta aktuell användare
    function getCurrentUser() {
        if (!currentUser) {
            currentUser = getUserData();
        }
        return currentUser;
    }

    // Visa registreringsmodalen
    function showRegistrationModal() {
        if (userModal) {
            userModal.style.display = 'flex';
            isModalVisible = true;
            // Fokusera på namn-fältet
            setTimeout(() => {
                const nameInput = document.getElementById('userFirstName');
                if (nameInput) nameInput.focus();
            }, 300);
            return;
        }
        createRegistrationModal();
    }

    // Stäng registreringsmodalen
    function closeRegistrationModal() {
        if (userModal) {
            userModal.style.display = 'none';
            isModalVisible = false;
        }
    }

    // Skapa registreringsmodalen
    function createRegistrationModal() {
        const modalHTML = `
            <div id="userRegistrationModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; justify-content:center; align-items:center; backdrop-filter:blur(8px);">
                <div style="background:#1e293b; border-radius:28px; padding:36px 40px; max-width:440px; width:100%; border:1px solid #475569; box-shadow:0 30px 80px rgba(0,0,0,0.7); animation:modalFadeIn 0.3s ease;">
                    <div style="text-align:center; margin-bottom:24px;">
                        <div style="width:64px; height:64px; background:linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:2rem;">
                            <i class="fas fa-user" style="color:white;"></i>
                        </div>
                        <h2 style="color:#f1f5f9; font-size:1.3rem; font-weight:700;">Välkommen!</h2>
                        <p style="color:#94a3b8; font-size:0.9rem; margin-top:4px;">Ange ditt namn för att identifiera dina uppladdningar</p>
                    </div>
                    
                    <form id="userRegistrationForm" style="display:flex; flex-direction:column; gap:16px;">
                        <div>
                            <label for="userFirstName" style="display:block; font-weight:500; color:#cbd5e1; font-size:0.85rem; margin-bottom:4px;">
                                <i class="fas fa-user"></i> Förnamn
                            </label>
                            <input type="text" id="userFirstName" placeholder="t.ex. Anna" 
                                   style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #334155; background:#0f172a; color:#f1f5f9; font-size:1rem; outline:none; transition:border 0.2s;"
                                   autocomplete="given-name" required>
                        </div>
                        
                        <div>
                            <label for="userLastName" style="display:block; font-weight:500; color:#cbd5e1; font-size:0.85rem; margin-bottom:4px;">
                                <i class="fas fa-user-tag"></i> Efternamn
                            </label>
                            <input type="text" id="userLastName" placeholder="t.ex. Svensson" 
                                   style="width:100%; padding:12px 16px; border-radius:12px; border:1px solid #334155; background:#0f172a; color:#f1f5f9; font-size:1rem; outline:none; transition:border 0.2s;"
                                   autocomplete="family-name" required>
                        </div>
                        
                        <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
                            <input type="checkbox" id="userRememberMe" checked style="accent-color:#3b82f6; width:16px; height:16px; cursor:pointer;">
                            <label for="userRememberMe" style="color:#94a3b8; font-size:0.8rem; cursor:pointer;">Kom ihåg mig på den här datorn</label>
                        </div>
                        
                        <button type="submit" id="userRegisterSubmit" 
                                style="padding:12px; background:linear-gradient(135deg, #3b82f6, #8b5cf6); border:none; border-radius:12px; color:white; font-weight:600; font-size:1rem; cursor:pointer; transition:transform 0.2s; margin-top:8px;">
                            <i class="fas fa-check-circle"></i> Fortsätt
                        </button>
                    </form>
                    
                    <div style="text-align:center; margin-top:16px; font-size:0.65rem; color:#64748b;">
                        <i class="fas fa-lock"></i> Uppgifterna sparas lokalt på din dator
                    </div>
                </div>
            </div>
        `;
        const div = document.createElement('div');
        div.innerHTML = modalHTML;
        document.body.appendChild(div.firstElementChild);
        userModal = document.getElementById('userRegistrationModal');

        // Lägg till CSS-animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.95) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
        `;
        document.head.appendChild(style);

        // Hantera formulärinlämning
        document.getElementById('userRegistrationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            handleRegistration();
        });

        // Enter-tangent i fälten
        document.getElementById('userFirstName').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('userLastName').focus();
            }
        });
        document.getElementById('userLastName').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('userRegistrationForm').dispatchEvent(new Event('submit'));
            }
        });

        // Stäng med Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isModalVisible) {
                // Vi tillåter inte att stänga med Escape eftersom registrering är obligatorisk
                // Men vi kan lägga till en varning
                showToast('Vänligen fyll i dina uppgifter för att fortsätta', true);
            }
        });

        isModalVisible = true;
    }

    // Hantera registrering
    function handleRegistration() {
        const firstName = document.getElementById('userFirstName').value.trim();
        const lastName = document.getElementById('userLastName').value.trim();
        const rememberMe = document.getElementById('userRememberMe').checked;

        if (!firstName) {
            showToast('Vänligen ange ditt förnamn', true);
            document.getElementById('userFirstName').focus();
            return;
        }
        if (!lastName) {
            showToast('Vänligen ange ditt efternamn', true);
            document.getElementById('userLastName').focus();
            return;
        }

        const userData = {
            firstName: firstName,
            lastName: lastName,
            fullName: firstName + ' ' + lastName,
            registeredAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        if (rememberMe) {
            saveUserData(userData);
        } else {
            // Spara bara i minnet, inte i localStorage
            currentUser = userData;
        }

        // Uppdatera globala variabler
        window.currentUser = userData;
        window.userFullName = userData.fullName;

        // Stäng modalen
        closeRegistrationModal();

        // Visa bekräftelse
        showToast('👋 Välkommen ' + userData.fullName + '!');

        // Uppdatera UI för att visa användaren
        updateUserDisplay(userData);

        // Om det finns en pågående uppladdning, använd det nya namnet
        console.log('✅ Användare registrerad:', userData.fullName);
    }

    // Uppdatera UI för att visa aktuell användare
    function updateUserDisplay(userData) {
        if (!userData) return;
        
        // Ta bort befintlig användarvisning om den finns
        const existingDisplay = document.getElementById('userDisplay');
        if (existingDisplay) existingDisplay.remove();

        // Lägg till användarvisning i headern
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const userDisplay = document.createElement('div');
        userDisplay.id = 'userDisplay';
        userDisplay.style.cssText = `
            display:flex; align-items:center; gap:8px; 
            background:#1e293b; padding:4px 12px 4px 8px; 
            border-radius:30px; border:1px solid #334155;
            font-size:0.8rem; color:#e2e8f0;
        `;
        
        // Initialer
        const initials = (userData.firstName.charAt(0) + userData.lastName.charAt(0)).toUpperCase();
        
        userDisplay.innerHTML = `
            <div style="width:28px; height:28px; background:linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.7rem; color:white; flex-shrink:0;">
                ${initials}
            </div>
            <span style="font-weight:500;">${escapeHtml(userData.fullName)}</span>
            <button id="changeUserBtn" style="background:none; border:none; color:#64748b; cursor:pointer; padding:2px 4px; font-size:0.65rem;" title="Byt användare">
                <i class="fas fa-edit"></i>
            </button>
        `;
        
        headerRight.appendChild(userDisplay);

        // Lägg till händelse för att byta användare
        document.getElementById('changeUserBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Vill du byta användare? Din nuvarande data sparas.')) {
                // Ta bort sparad användare
                localStorage.removeItem(STORAGE_KEY);
                currentUser = null;
                window.currentUser = null;
                // Visa registreringsmodalen igen
                setTimeout(() => showRegistrationModal(), 300);
            }
        });
    }

    // Hjälpfunktion för att hämta användarnamn för uppladdning
    function getUploaderName() {
        const user = getCurrentUser();
        if (user) {
            return user.fullName;
        }
        // Fallback om ingen användare är registrerad
        return 'Användare';
    }

    // Exponera funktioner för användning i huvudkoden
    window.getCurrentUser = getCurrentUser;
    window.getUploaderName = getUploaderName;
    window.isUserRegistered = isUserRegistered;
    window.showRegistrationModal = showRegistrationModal;
    window.closeRegistrationModal = closeRegistrationModal;
    window.updateUserDisplay = updateUserDisplay;

    // ==================== MODIFIERA UPLOAD-FUNKTIONEN ====================
    // Patcha originalets uploadFiles för att inkludera användarnamn
    
    function patchUploadFunction() {
        // Vänta tills den ursprungliga upload-funktionen finns
        const checkInterval = setInterval(() => {
            // Kolla om uploadFiles finns och om den redan är patchad
            if (window.uploadFiles && !window._uploadPatched) {
                // Spara originalfunktionen
                const originalUpload = window.uploadFiles;
                
                // Skapa en ny funktion som inkluderar användarnamn
                window.uploadFiles = async function(filesToUpload) {
                    // Hämta aktuell användare
                    const user = getCurrentUser();
                    const uploaderName = user ? user.fullName : 'Användare';
                    
                    // Spara användarnamnet globalt för användning i upload-processen
                    window._currentUploader = uploaderName;
                    
                    // Anropa originalfunktionen
                    return originalUpload.call(this, filesToUpload);
                };
                
                // Markera som patchad
                window._uploadPatched = true;
                console.log('✅ uploadFiles patched med användarnamn');
                clearInterval(checkInterval);
            }
        }, 100);
    }

    // ==================== INITIERING ====================
    function init() {
        // Kontrollera om användaren redan är registrerad
        const userData = getUserData();
        
        if (userData) {
            currentUser = userData;
            window.currentUser = userData;
            window.userFullName = userData.fullName;
            
            // Visa användaren i UI
            setTimeout(() => {
                updateUserDisplay(userData);
            }, 500);
            
            console.log('✅ Användare inloggad:', userData.fullName);
        } else {
            // Visa registreringsmodalen efter en kort fördröjning
            setTimeout(() => {
                showRegistrationModal();
            }, 800);
        }

        // Patcha upload-funktionen
        patchUploadFunction();

        // Spara användarnamn vid varje uppladdning
        // Övervaka fileInput för att sätta användarnamn
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'fileInput') {
                // Spara användarnamnet för denna uppladdning
                const user = getCurrentUser();
                if (user) {
                    window._currentUploader = user.fullName;
                }
            }
        });

        console.log('✅ user-register.js initierad');
    }

    // Vänta på att DOM är klar
    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    // ==================== ÖVERSKRIV DATABASE PUSH ====================
    // För att säkerställa att alla filer får användarnamn, patchar vi databasref
    
    function patchDatabasePush() {
        // Vänta tills database finns
        const checkInterval = setInterval(() => {
            if (window.database && !window._dbPatched) {
                const originalPush = window.database.ref('shared_files').push;
                
                // Spara referensen
                const sharedRef = window.database.ref('shared_files');
                
                // Skapa en patched push-funktion
                sharedRef.push = function(data) {
                    // Lägg till användarnamn om det inte redan finns
                    if (data && typeof data === 'object') {
                        const user = getCurrentUser();
                        if (user && !data.uploadedBy) {
                            data.uploadedBy = user.fullName;
                        }
                    }
                    // Anropa original
                    return originalPush.call(this, data);
                };
                
                window._dbPatched = true;
                console.log('✅ Database push patched med användarnamn');
                clearInterval(checkInterval);
            }
        }, 200);
    }

    // ==================== HJÄLPFUNKTIONER ====================
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showToast(msg, isError = false) {
        if (window.showToast) window.showToast(msg, isError);
        else if (window.visaMeddelande) window.visaMeddelande(msg, isError);
        else alert(msg);
    }

    // ==================== START ====================
    ready(() => {
        // Vänta på att Firebase är redo
        const startInterval = setInterval(() => {
            if (window.database) {
                clearInterval(startInterval);
                init();
                patchDatabasePush();
            }
        }, 200);

        // Fallback
        setTimeout(() => {
            if (!window._userRegisterInitialized) {
                window._userRegisterInitialized = true;
                if (!window.database) {
                    console.warn('⚠️ Firebase inte tillgänglig, försöker ändå initiera');
                }
                init();
                patchDatabasePush();
            }
        }, 3000);
    });

    // Exportera även för användning i andra skript
    window._userRegisterInitialized = true;
    console.log('📝 user-register.js laddad');
})();