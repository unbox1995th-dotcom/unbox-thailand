# Shirt Catalog

เว็บไซต์รวมแบบเสื้อและสินค้าทั้งหมด — Powered by Next.js + Supabase + Vercel

## Stack
- **Frontend**: Next.js 14 + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (รูปภาพ)
- **Hosting**: Vercel

## Setup

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/shirt-catalog.git
cd shirt-catalog
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://rycjohhdgvmwzpdqhtrk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Development
```bash
npm run dev
```

Open [http://localhost:3000/catalog](http://localhost:3000/catalog)

## Admin Login
| Name ID | Password |
|---------|----------|
| ceo edit00 | 00000000 |
| ceo edit01 | 00001111 |
| ... | ... |
| ceo edit09 | 00009999 |

## Deploy to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push
