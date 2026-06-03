# Archivio — Scalable Enterprise Backend API

> **Core Infrastructure for Modern Digital Archiving**  
> RESTful API berkinerja tinggi yang dirancang sebagai tulang punggung sistem manajemen dokumen digital. Mengimplementasikan arsitektur *stateless*, autentikasi JWT terenkripsi, dan manajemen data relasional yang ketat untuk menjamin ketersediaan dan integritas informasi organisasi.

---

## Technical Infrastructure Architecture

Archivio Backend dibangun dengan fokus pada keamanan dan efisiensi pemrosesan data:
- **Asynchronous Processing**: Memanfaatkan runtime Node.js untuk menangani I/O intensif seperti pengelolaan file dan komunikasi SMTP tanpa memblokir proses utama.
- **Relational Data Integrity**: Implementasi [Prisma ORM](https://www.prisma.io/) untuk menjamin konsistensi skema database MySQL dan performa query yang optimal.
- **Secure File Storage Layer**: Manajemen penyimpanan file fisik dengan sistem penamaan unik (UUID-based) dan kontrol akses terproteksi.
- **Trash & Cleanup Management**: Sistem pembersihan otomatis untuk dokumen yang ditolak (*Rejected*) guna mengoptimalkan kapasitas penyimpanan.
- **Middleware Pipeline Architecture**: Sistem pemrosesan permintaan berlapis untuk validasi data, autentikasi, dan otorisasi sebelum mencapai logika bisnis inti.

---

## Core Technical Stack

| Platform | Implementation Detail |
|---|---|
| **Runtime Environment** | [Node.js](https://nodejs.org/) — Engine eksekusi JavaScript sisi server yang scalable. |
| **Server Framework** | [Express.js](https://expressjs.com/) — Arsitektur routing modular dan middleware-centric. |
| **ORM & Persistence** | [Prisma](https://www.prisma.io/) — Pemetaan objek relasional dengan *type-safety* maksimal. Mendukung fitur metadata dokumen dan manajemen konfigurasi sistem (`Setting` model). |
| **Database Engine** | [MySQL](https://www.mysql.com/) — Penyimpanan data relasional yang stabil dan handal. |
| **Security & Auth** | [JWT](https://jwt.io/) & [Bcrypt](https://github.com/kelektiv/node.bcrypt.js) — Standar industri untuk enkripsi password dan sesi stateless. |
| **File Management** | [Multer](https://github.com/expressjs/multer) — Penanganan aliran data biner (PDF/DOCX) secara efisien. |
| **Email Infrastructure** | [Nodemailer](https://nodemailer.com/) — Integrasi layanan notifikasi sistem berbasis SMTP. |

---

## Role-Based Access Control (RBAC) & Governance

Sistem menerapkan kebijakan keamanan akses yang ketat sesuai dengan hierarki organisasi:

1.  **Administrative Governance**: Otoritas penuh terhadap siklus hidup dokumen, manajemen parameter sistem, dan pengawasan audit trail pengguna.
2.  **Staff Operational Level**: Hak akses operasional untuk pengajuan draf dokumen, pencarian informasi terverifikasi, dan manajemen profil personal.

---

## System Directory Architecture

```
Backend/
├── prisma/
│   ├── schema.prisma        # Arsitektur model data & relasi entitas
│   └── migrations/          # Version control untuk struktur database
├── src/
│   ├── app.js               # Entry point & konfigurasi middleware sistem
│   ├── controllers/         # Implementasi logika bisnis dan handler endpoint
│   ├── middlewares/         # Layer proteksi (JWT Verify, Role Guard, File Filter)
│   ├── routes/              # Definisi gerbang API (Endpoint mapping)
│   ├── services/            # Layer abstraksi manipulasi data (Prisma Integration)
│   └── utils/               # Utilitas pendukung & standarisasi respon sistem
├── uploads/                 # Repositori penyimpanan file fisik terenkripsi
└── package.json             # Manajemen dependensi & metadata proyek
```

---

## Infrastructure Setup

### 1. Environment Configuration (`.env`)
Pastikan parameter berikut dikonfigurasi secara akurat sebelum menjalankan server:
```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/archivio_db"
JWT_SECRET="generate_strong_alphanumeric_secret"
PORT=3000
```

### 2. Deployment Steps
```bash
# Instalasi Dependensi
npm install

# Database Synchronization
npx prisma generate
npx prisma migrate dev --name init

# Membuat Akun Admin Default
npx prisma db seed

# Start Service
npm run dev
```

---

## Advanced Security Protocols

- **Bcrypt Password Hashing**: Mengamankan kredensial pengguna dengan algoritma *salted hashing* tingkat lanjut.
- **Atomic File Operations**: Menjamin sinkronisasi antara metadata database dan file fisik di storage (Clean-up otomatis saat data dihapus).
- **JWT Stateless Authentication**: Mengeliminasi kebutuhan penyimpanan sesi di sisi server untuk skalabilitas yang lebih baik.
- **Resource Sanitization**: Validasi tipe file (MIME-type) dan ukuran untuk mencegah injeksi aset berbahaya.

---

## License & Compliance
Proyek ini dikembangkan sebagai bagian dari infrastruktur internal organisasi.  
**Archivio Backend © 2026**
