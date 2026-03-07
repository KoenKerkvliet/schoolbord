# Het Schoolbord

Een moderne webapp voor schoolbeheer, gebouwd met React en Supabase.

## Setup

### 1. Vereisten
- Node.js (v16+)
- npm of yarn
- Supabase account

### 2. Installatie

```bash
npm install
```

### 3. Supabase Configuratie

1. Maak een nieuw Supabase project aan op https://supabase.com
2. Kopieer je `SUPABASE_URL` en `SUPABASE_ANON_KEY`
3. Zet deze in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Database Schema

Voer het volgende SQL uit in je Supabase SQL editor:

```sql
-- Roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (name, description) VALUES
  ('super_admin', 'Globale beheerder - kan alles beheren'),
  ('admin', 'Organisatie beheerder - kan hun organisatie beheren'),
  ('writer', 'Kan inhoud schrijven en aanpassen'),
  ('viewer', 'Kan alleen bekijken');

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users with organizations table
CREATE TABLE user_organization_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);
```

### 5. Super Admin Instellingen

Nadat je de setup hebt voltooid:

1. Registreer jezelf in de app
2. In de Supabase console, voeg jezelf toe als super_admin in `user_organization_roles`
3. Super admins hebben globale toegang en kunnen organisaties beheren

### 6. Development Server

```bash
npm run dev
```

De app is beschikbaar op http://localhost:5173

## Functionaliteiten

- ✅ Authenticatie (login/signup)
- ✅ Dashboard met sidebar
- ✅ Profiel pagina
- ✅ Instellingen pagina
- ⏳ Organisatie beheer
- ⏳ Rollengebaseerde toegangsbeheer
- ⏳ Join codes voor organisaties

## Project Structuur

```
src/
├── components/
│   ├── auth/          # Login & Signup pages
│   ├── layout/        # Dashboard layout & sidebar
│   └── pages/         # Dashboard, Profile, Settings
├── context/           # React Context (Auth)
├── services/          # Supabase & Auth services
├── App.jsx
└── main.jsx
```

## Deployment

Dit project kan eenvoudig gedeployed worden op GitHub Pages, Vercel, Netlify, etc.

Zorg ervoor dat je environment variabelen correct zijn ingesteld op je hosting platform.

## Support

Voor meer informatie, zie de [Supabase documentatie](https://supabase.com/docs)
