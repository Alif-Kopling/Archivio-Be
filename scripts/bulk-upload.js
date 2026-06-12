/**
 * Bulk document uploader — generates random documents via API
 *
 * Usage:
 *   1. Make sure backend is running (npm run dev)
 *   2. node scripts/bulk-upload.js
 *
 * What it does:
 *   - Logs in as admin
 *   - For each month Jan–Jun 2026:
 *       - Surat Masuk:  50–100 docs
 *       - Surat Keluar:  40–90 docs
 *       - Sertifikat:    30–50 docs (with random meme images)
 *   - Each doc gets a random date within that month, random title/sender/status
 *
 * Requirements: Node.js 18+ (built-in fetch + FormData)
 */

const BASE = 'http://localhost:3000';

// ─── Data pools ──────────────────────────────────────────────

const TITLES_MASUK = [
  'Surat Undangan Rapat Koordinasi Tahunan',
  'Surat Pemberitahuan Kegiatan Workshop',
  'Surat Tugas Melaksanakan Dinas Luar',
  'Surat Edaran Tentang Kebijakan Baru',
  'Surat Permohonan Data Arsip',
  'Surat Pemberitahuan Jadwal Rapat',
  'Surat Undangan Sosialisasi Program',
  'Surat Permohonan Bantuan Teknis',
  'Surat Konfirmasi Kehadiran Rapat',
  'Surat Pemberitahuan Perubahan Jadwal',
  'Surat Permohonan Informasi Publik',
  'Surat Undangan Acara Puncak HUT',
  'Surat Tugas Pendampingan Lapangan',
  'Surat Edaran Pembatasan Kegiatan',
  'Surat Pemberitahuan Libur Nasional',
  'Surat Permohonan Peminjaman Ruang',
  'Surat Undangan Bimtek Pengelolaan Arsip',
  'Surat Konfirmasi Penerimaan Dokumen',
  'Surat Pemberitahuan Hasil Seleksi',
  'Surat Permohonan Kerja Sama,',
  'Surat Undangan Evaluasi Program',
  'Surat Edaran Pengisian Laporan',
  'Surat Tugas Mengikuti Pelatihan',
  'Surat Pemberitahuan Perubahan Struktur',
  'Surat Permohonan Rekomendasi',
  'Surat Undangan Pembukaan Acara',
  'Surat Konfirmasi Jadwal Kunjungan',
  'Surat Pemberitahuan Pemutakhiran Data',
  'Surat Permohonan Anggaran Kegiatan',
  'Surat Edaran Disiplin Pegawai',
  'Surat Undangan Rapat Dinas',
  'Surat Tugas Monitoring dan Evaluasi',
  'Surat Pemberitahuan Penyesuaian Tarif',
  'Surat Permohonan Perpanjangan Waktu',
  'Surat Konfirmasi Peserta Kegiatan',
  'Surat Edaran Pemeliharaan Fasilitas',
  'Surat Undangan Forum Komunikasi',
  'Surat Pemberitahuan Sosialisasi Aplikasi',
  'Surat Permohonan Dokumen Pendukung',
  'Surat Tugas Verifikasi Lapangan',
  'Surat Undangan Musyawarah Kerja',
  'Surat Edaran Penggunaan Sistem Baru',
  'Surat Pemberitahuan Hasil Pemeriksaan',
  'Surat Permohonan Ketersediaan Narasumber',
  'Surat Konfirmasi Ketersediaan Tempat',
  'Surat Undangan Seminar Nasional',
  'Surat Tugas Koordinasi Lintas Sektor',
  'Surat Pemberitahuan Pemotongan Anggaran',
  'Surat Permohonan Data Statistik',
  'Surat Edaran Pengisian Survey Kepuasan',
  'Surat Undangan Halal Bihalal',
  'Surat Tugas Pendataan Ulang',
  'Surat Pemberitahuan Jadwal Sidang',
  'Surat Permohonan Faksimile Dokumen',
  'Surat Konfirmasi Perubahan Data',
  'Surat Undangan Pelatihan Manajemen',
  'Surat Edaran Mutasi Pegawai',
  'Surat Pemberitahuan Penutupan Sementara',
  'Surat Permohonan Izin Penyelenggaraan',
  'Surat Tugas Audit Internal',
  'Surat Undangan Pameran Arsip',
  'Surat Konfirmasi Keikutsertaan',
  'Surat Edaran Pengelolaan Keuangan',
  'Surat Pemberitahuan Perubahan Alamat',
  'Surat Permohonan Sponsor Kegiatan',
  'Surat Undangan FGD Penyusunan Regulasi',
  'Surat Tugas Pengawasan Lapangan',
  'Surat Pemberitahuan Pengumuman',
  'Surat Permohonan Perbaikan Data',
  'Surat Edaran Pembentukan Tim Khusus',
  'Surat Undangan Acara Wisuda',
  'Surat Konfirmasi Penyerahan Berkas',
  'Surat Pemberitahuan Perpanjangan Kontrak',
  'Surat Permohonan Penerbitan Sertifikat',
  'Surat Tugas Rekonsiliasi Data',
  'Surat Edaran Pencegahan Pelanggaran',
  'Surat Undangan Rapat Pleno',
  'Surat Pemberitahuan Perubahan Sistem',
  'Surat Permohonan Bantuan Hukum',
  'Surat Konfirmasi Penyelesaian Tugas',
  'Surat Undangan Acara Bakti Sosial',
  'Surat Edaran Pengarsipan Digital',
  'Surat Tugas Sosialisasi Peraturan Baru',
  'Surat Pemberitahuan Masa Berlaku',
  'Surat Permohonan Akses Database',
  'Surat Undangan Rapat Evaluasi Semester',
  'Surat Konfirmasi Penggunaan Anggaran',
  'Surat Edaran Kebersihan Lingkungan',
  'Surat Pemberitahuan Pemadaman Listrik',
  'Surat Permohonan Perubahan Nama',
  'Surat Tugas Inventarisasi Aset',
  'Surat Undangan Acara Syukuran',
  'Surat Pemberitahuan Pencairan Dana',
  'Surat Permohonan Data Pegawai',
  'Surat Konfirmasi Penempatan Kembali',
  'Surat Edaran Efisiensi Energi',
  'Surat Undangan Bazar UMKM',
  'Surat Tugas Evaluasi Kinerja',
  'Surat Pemberitahuan Penghentian Layanan',
];

const TITLES_KELUAR = [
  'Surat Tugas Resmi Dinas Luar',
  'Surat Undangan Rapat Mitra Kerja',
  'Surat Pemberitahuan Hasil Keputusan',
  'Surat Permohonan Kerja Sama Antar Instansi',
  'Surat Edaran Hasil Rapat Koordinasi',
  'Surat Tugas Mengikuti Kegiatan Eksternal',
  'Surat Pemberitahuan Jadwal Kunjungan',
  'Surat Permohonan Data Ke Instansi Terkait',
  'Surat Konfirmasi Acara Kedinasan',
  'Surat Undangan Pembahasan Anggaran',
  'Surat Tugas Verifikasi Data Mitra',
  'Surat Pemberitahuan Perubahan Kebijakan',
  'Surat Permohonan Tenaga Ahli',
  'Surat Edaran Tindak Lanjut Hasil Audit',
  'Surat Undangan Sosialisasi Program Baru',
  'Surat Konfirmasi Kerja Sama Proyek',
  'Surat Tugas Monitoring Pembangunan',
  'Surat Pemberitahuan Workshop Eksternal',
  'Surat Permohonan Konsultasi Hukum',
  'Surat Undangan Rapat Evaluasi Capaian',
];

const TITLES_SERTIFIKAT = [
  'Sertifikat Kepemimpinan Nasional',
  'Sertifikat Pelatihan Manajemen Arsip',
  'Sertifikat Workshop Digitalisasi Dokumen',
  'Sertifikat Seminar Administrasi Perkantoran',
  'Sertifikat Bimtek Pengelolaan Surat',
  'Sertifikat Pelatihan Sistem Informasi Arsip',
  'Sertifikat Diklat Kepemimpinan Tingkat Lanjut',
  'Sertifikat Pelatihan Kearsipan Terintegrasi',
  'Sertifikat Webinar Transformasi Digital',
  'Sertifikat Workshop Manajemen Talenta',
  'Sertifikat Seminar Nasional Pelayanan Publik',
  'Sertifikat Bimtek Analisis Kebijakan',
  'Sertifikat Pelatihan Tata Naskah Dinas',
  'Sertifikat Diklat Peningkatan Kompetensi',
  'Sertifikat Workshop Penyusunan Laporan',
  'Sertifikat Seminar Teknologi Informasi',
  'Sertifikat Pelatihan Pengamanan Dokumen',
  'Sertifikat Webinar Inovasi Pelayanan',
  'Sertifikat Bimtek Pengawasan Internal',
  'Sertifikat Pelatihan Manajemen Perubahan',
  'Sertifikat Diklat Kepemimpinan Madya',
  'Sertifikat Workshop Administrasi Keuangan',
  'Sertifikat Seminar Hukum dan Regulasi',
  'Sertifikat Pelatihan Public Speaking',
  'Sertifikat Webinar Kearsipan Elektronik',
  'Sertifikat Bimtek Perencanaan Program',
  'Sertifikat Pelatihan Komunikasi Efektif',
  'Sertifikat Diklat Fungsional Arsiparis',
  'Sertifikat Workshop Evaluasi Program',
  'Sertifikat Seminar Nasional Kepemimpinan',
  'Sertifikat Pelatihan Penyusunan SOP',
  'Sertifikat Webinar Manajemen Stres Kerja',
  'Sertifikat Bimtek Pengelolaan Asset',
  'Sertifikat Pelatihan Analisis Data',
  'Sertifikat Diklat Pimpinan Muda',
  'Sertifikat Workshop Kearsipan Digital',
  'Sertifikat Seminar Anti Korupsi',
  'Sertifikat Pelatihan Branding Instansi',
  'Sertifikat Webinar Produktivitas Kerja',
  'Sertifikat Bimtek Pelayanan Prima',
  'Sertifikat Pelatihan Penyusunan Anggaran',
  'Sertifikat Diklat Manajemen Risiko',
  'Sertifikat Workshop Penulisan Laporan',
  'Sertifikat Seminar Etika Profesi',
  'Sertifikat Pelatihan Customer Service',
  'Sertifikat Webinar Kepemimpinan Digital',
  'Sertifikat Bimtek Pengembangan SDM',
  'Sertifikat Pelatihan Problem Solving',
  'Sertifikat Diklat Administrasi Terpadu',
  'Sertifikat Workshop Penataan Arsip',
];

const SENDERS = [
  'Kementerian Pendidikan dan Kebudayaan',
  'Badan Kepegawaian Negara',
  'Kementerian Keuangan RI',
  'Pemerintah Provinsi Jawa Barat',
  'Pemerintah Kota Bandung',
  'Pemerintah Kabupaten Bandung',
  'Kementerian Hukum dan HAM',
  'Kementerian Dalam Negeri',
  'Badan Pemeriksa Keuangan',
  'Kementerian PUPR',
  'Perusahaan Umum Percetakan Negara',
  'PT Pos Indonesia (Persero)',
  'Badan Pusat Statistik',
  'Kementerian Kesehatan RI',
  'Kementerian Sosial RI',
  'Ombudsman RI',
  'Badan Siber dan Sandi Negara',
  'Lembaga Administrasi Negara',
  'Pemerintah Provinsi DKI Jakarta',
  'Kementerian Agama RI',
  'Badan Koordinasi Penanaman Modal',
  'Kementerian Luar Negeri',
  'Kejaksaan Agung RI',
  'Mahkamah Agung RI',
  'Kepolisian Negara RI',
  'TNI Angkatan Darat',
  'Bank Indonesia',
  'Otoritas Jasa Keuangan',
  'Badan Pembangunan Internasional',
  'Perusahaan Listrik Negara',
  'Pemerintah Provinsi Jawa Tengah',
  'Pemerintah Kota Semarang',
  'Pemerintah Provinsi Jawa Timur',
  'Pemerintah Kota Surabaya',
  'Badan Penyelenggara Jaminan Sosial',
  'Kementerian Perindustrian',
  'Kementerian Perdagangan',
  'Kementerian Pariwisata',
  'Badan Informasi Geospasial',
  'Pemerintah Provinsi Banten',
  'Pemerintah Kota Tangerang',
  'Badan Pengawas Obat dan Makanan',
  'Kementerian Ketenagakerjaan',
  'Badan Pertanahan Nasional',
  'Pemerintah Kabupaten Bogor',
  'Universitas Indonesia',
  'Institut Teknologi Bandung',
  'Universitas Gadjah Mada',
  'Lembaga Ilmu Pengetahuan Indonesia',
  'Badan Tenaga Nuklir Nasional',
];

const STATUS_POOL = ['pending', 'final', 'final', 'final', 'final', 'rejected'];

// ─── Helpers ─────────────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = randomInt(1, daysInMonth);
  const d = new Date(year, month - 1, day);
  const h = randomInt(8, 16);
  const m = randomInt(0, 59);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Minimal valid PDF buffer (~250 bytes) that passes magic-byte check */
function createMinimalPdf() {
  const content = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f 
0000000015 00000 n 
0000000062 00000 n 
0000000119 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
192
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

// ─── Main ────────────────────────────────────────────────────

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@gmail.com', password: 'admin123' }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Login gagal: ${e.error || res.statusText}`);
  }
  const data = await res.json();
  return data.token;
}

async function uploadDoc(token, type, formData) {
  const endpoints = {
    'masuk': '/surat-masuk',
    'keluar': '/surat-keluar',
    'sertifikat': '/sertifikat',
  };
  const ep = endpoints[type];
  if (!ep) throw new Error(`Unknown type: ${type}`);

  const res = await fetch(`${BASE}${ep}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`${type}: ${e.error || res.statusText}`);
  }
  return res.json();
}

async function downloadMemeImage() {
  // picsum.photos returns a real JPG with valid magic bytes
  const res = await fetch('https://picsum.photos/400/300', {
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`Gagal download gambar: ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer;
}

async function uploadBatch(token, type, month, year, count) {
  let success = 0;
  let failed = 0;
  const label = type === 'masuk' ? 'Surat Masuk' : type === 'keluar' ? 'Surat Keluar' : 'Sertifikat';

  for (let i = 0; i < count; i++) {
    try {
      const date = randomDateInMonth(year, month);
      const dateStr = date.toISOString().slice(0, 10);
      const titles = type === 'masuk' ? TITLES_MASUK : type === 'keluar' ? TITLES_KELUAR : TITLES_SERTIFIKAT;
      const title = `${pick(titles)} ${dateStr}`;
      const status = pick(STATUS_POOL);
      const sender = type !== 'sertifikat' ? pick(SENDERS) : undefined;

      const formData = new FormData();

      if (type === 'sertifikat') {
        const imgBuffer = await downloadMemeImage();
        const blob = new Blob([imgBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, `meme_${Date.now()}.jpg`);
      } else {
        const pdfBuffer = createMinimalPdf();
        const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
        const senderSlug = sender.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
        formData.append('file', blob, `doc_${senderSlug}_${Date.now()}.pdf`);
      }

      formData.append('title', title);
      formData.append('documentDate', dateStr);
      formData.append('status', status);
      if (sender) formData.append('sender', sender);
      formData.append('approverIds', '[]');

      await uploadDoc(token, type, formData);
      success++;
      process.stdout.write('.');
    } catch (err) {
      failed++;
      process.stdout.write('x');
    }
  }
  console.log(`\n  ✓ ${success} berhasil, ${failed} gagal`);
  return { success, failed };
}

async function main() {
  console.log('╔══════════════════════════════════════╗');
  console.log('║     Bulk Document Uploader v1.0      ║');
  console.log('╚══════════════════════════════════════╝\n');

  // Login
  console.log('→ Login sebagai admin...');
  let token;
  try {
    token = await login();
    console.log('  ✓ Login berhasil\n');
  } catch (err) {
    console.error(`  ✗ ${err.message}`);
    console.log('\nPastikan backend sudah running di port 5000.');
    process.exit(1);
  }

  const YEAR = 2026;
  let totalAll = 0;
  let successAll = 0;
  let failedAll = 0;

  for (let month = 1; month <= 6; month++) {
    const monthName = new Date(YEAR, month - 1, 1).toLocaleString('en', { month: 'long' });
    const masukCount = randomInt(50, 100);
    const keluarCount = randomInt(40, 90);
    const sertifCount = randomInt(30, 50);
    const monthTotal = masukCount + keluarCount + sertifCount;
    totalAll += monthTotal;

    console.log(`══════════ ${monthName} ${YEAR} — ${monthTotal} dokumen ══════════\n`);

    console.log(`→ Upload ${masukCount} Surat Masuk...`);
    const masuk = await uploadBatch(token, 'masuk', month, YEAR, masukCount);
    successAll += masuk.success;
    failedAll += masuk.failed;

    console.log(`→ Upload ${keluarCount} Surat Keluar...`);
    const keluar = await uploadBatch(token, 'keluar', month, YEAR, keluarCount);
    successAll += keluar.success;
    failedAll += keluar.failed;

    console.log(`→ Upload ${sertifCount} Sertifikat (meme)...`);
    const sertif = await uploadBatch(token, 'sertifikat', month, YEAR, sertifCount);
    successAll += sertif.success;
    failedAll += sertif.failed;

    console.log('');
  }

  console.log('══════════════════════════════════════════');
  console.log(`  Total: ${totalAll} dokumen`);
  console.log(`  ✓ ${successAll} berhasil`);
  console.log(`  ✗ ${failedAll} gagal`);
  console.log('══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
