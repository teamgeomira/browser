
---

# README.md

```markdown
# Delad Mapp Online - Sincronizador

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-green" alt="Node.js">
  <img src="https://img.shields.io/badge/Firebase-Realtime%20Database-orange" alt="Firebase">
  <img src="https://img.shields.io/badge/Cloudinary-Upload-blue" alt="Cloudinary">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</div>

## 📋 Descripción

**Delad Mapp Online** es una aplicación de sincronización de archivos similar a Mega.nz, que te permite mantener tus archivos sincronizados entre tu carpeta local y la nube (Firebase + Cloudinary).

### 🎯 Características principales

- 📂 **Sincronización bidireccional** - Local ↔ Nube
- ☁️ **Almacenamiento en Cloudinary** - Archivos guardados en la nube
- 🗄️ **Metadatos en Firebase** - Estructura y metadatos de archivos
- 👀 **Monitoreo en tiempo real** - Detecta cambios automáticamente
- 🎨 **Interfaz integrada** - Panel de control dentro de tu index.html
- 📊 **Estadísticas en vivo** - Progreso y estado de sincronización

---

## 🚀 Instalación

### Prerrequisitos

- Node.js (v18 o superior)
- npm (v9 o superior)
- Cuenta en Firebase (Realtime Database)
- Cuenta en Cloudinary

### Pasos de instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/delad-mapp-sync.git
cd delad-mapp-sync

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor
node server.js

# 4. Abrir en el navegador
# http://localhost:3001