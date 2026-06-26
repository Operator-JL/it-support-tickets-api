# Setup rapido de Google OAuth para SIST

Este flujo no usa client secret. Google valida la identidad, el backend verifica el ID token y SIST crea su propio JWT interno.

## 1. Google Cloud

1. Abre Google Cloud Console.
2. Crea o elige un proyecto.
3. Ve a **APIs & Services > OAuth consent screen** y completa la pantalla de consentimiento.
4. Ve a **APIs & Services > Credentials**.
5. Crea credencial tipo **OAuth client ID**.
6. Tipo de aplicacion: **Web application**.
7. Authorized JavaScript origin:

```text
http://localhost:5173
```

8. Copia el Client ID.

## 2. Backend

Copia `.env.example` a `.env` y pega el Client ID:

```env
GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
GOOGLE_DEFAULT_ROLE=usuario
```

Para que el profesor se cree como admin al entrar por Google:

```env
GOOGLE_ADMIN_EMAILS=profesor@ejemplo.edu
```

Para restringir acceso por correo:

```env
GOOGLE_ALLOWED_EMAILS=profesor@ejemplo.edu,alumno@ejemplo.edu
```

Para restringir acceso por dominio:

```env
GOOGLE_ALLOWED_DOMAIN=ejemplo.edu
```

Si `GOOGLE_ALLOWED_EMAILS` y `GOOGLE_ALLOWED_DOMAIN` quedan vacios, SIST permite auto-crear usuarios Google con rol `usuario`.

## 3. Frontend

Copia `frontend/.env.example` a `frontend/.env` y pega el mismo Client ID:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

## 4. Correr demo

1. Ejecuta `database.sql` en SQL Server.
2. Backend:

```powershell
npm install
npm run dev
```

3. Frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. Abre `http://localhost:5173`.
5. Usa **Continuar con Google**.
6. Confirma que se crea un usuario en `dbo.Users` con `provider='google'`, `google_id`, `is_active=1` e `is_online=0`.

