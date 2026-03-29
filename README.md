# Sistem Asesmen PKBM Cendikia Cemerlang

Aplikasi manajemen asesmen berbasis web untuk PKBM (Pusat Kegiatan Belajar Masyarakat) dengan sinkronisasi data real-time menggunakan Firebase.

## Fitur

- **Manajemen Siswa & Guru** — data lengkap peserta didik dan pendidik
- **Asesmen & Ujian** — pembuatan soal, pelaksanaan ujian online, penilaian
- **Nilai & Rapor** — rekap nilai, kenaikan kelas, kelulusan
- **Sumber Belajar** — video pembelajaran, perangkat ajar, materi digital
- **Sync Real-Time** — data tersinkron otomatis ke semua perangkat via Firebase
- **Multi-Role** — Admin, Guru, dan Siswa dengan akses berbeda

## Struktur Project

```
pkbm-project/
├── index.html          # Halaman utama (HTML + CSS inline)
├── firebase-sdk.js     # Firebase SDK bundle (offline, no CDN)
├── firebase-sync.js    # Engine sinkronisasi real-time Firebase
├── app.js              # Logic utama aplikasi
├── firebase.json       # Konfigurasi Firebase Hosting
├── .firebaserc         # Project Firebase aktif
├── database.rules.json # Rules Realtime Database
├── firestore.rules     # Rules Firestore
├── firestore.indexes.json
├── storage.rules       # Rules Firebase Storage
├── .gitignore
└── README.md
```

## Firebase Project

| Setting | Value |
|---|---|
| Project ID | `fir-config-bbd5f` |
| Auth Domain | `fir-config-bbd5f.firebaseapp.com` |
| Database URL | `https://fir-config-bbd5f-default-rtdb.firebaseio.com` |
| Storage Bucket | `fir-config-bbd5f.firebasestorage.app` |

## Cara Pakai

### Buka Langsung
Cukup buka `index.html` di browser — Firebase SDK sudah di-bundle, tidak butuh koneksi ke CDN.

### Deploy ke Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy
```

Setelah deploy, aplikasi bisa diakses di:
`https://fir-config-bbd5f.web.app`

### Deploy via GitHub Actions (opsional)

Tambahkan secret `FIREBASE_TOKEN` di GitHub repo Settings → Secrets, lalu buat `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_TOKEN }}
          projectId: fir-config-bbd5f
```

## Login Default

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | (sesuai data embedded) |
| Guru | (lihat data siswa/guru) | — |
| Siswa | (NIS masing-masing) | — |

## Teknologi

- HTML5 + CSS3 (vanilla, no framework)
- JavaScript ES6+ (vanilla, no framework)
- Firebase v9.23.0 (Realtime Database, Firestore, Auth, Storage)
- Firebase Hosting
