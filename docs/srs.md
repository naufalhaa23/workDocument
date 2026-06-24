# Software Requirements Specification (SRS)
## Aplikasi Monitoring Dokumen Kerja dan Pengelolaan Inventaris

**Status Dokumen:** Final (Current State)

---

## 1. Pendahuluan
### 1.1 Tujuan
Dokumen ini menspesifikasikan kebutuhan perangkat lunak dan arsitektur untuk sistem "Manajemen Dokumen Kerja". Pembaruan spesifikasi ini mencakup fungsionalitas Notifikasi WhatsApp (Fonnte API), Kanban Board Publik Berkeamanan (System Settings Database), fitur *upload evidence* bagi *bypass role* (Admin), dan optimasi antarmuka perangkat bergerak (Mobile UI).

### 1.2 Lingkungan Teknologi (Tech Stack)
- **Backend:** Node.js, Express, Prisma ORM, MariaDB, Socket.io, Node-cron.
- **Frontend:** React, TypeScript, Mantine UI v7, Vite.
- **Third-Party API:** Fonnte (WhatsApp Gateway API).

## 2. Deskripsi Umum
### 2.1 Perspektif Produk
Sistem ini merupakan pengembangan dari sistem manajemen dokumen berbasis tabel menjadi sebuah ekosistem *omnichannel* yang proaktif (notifikasi *push* ke HP pengguna) dan transparan secara publik (Kanban Webview) tanpa membahayakan data internal perusahaan.

### 2.2 Karakteristik Pengguna
- **Superadmin:** Mengonfigurasi variabel global (`SystemSetting`), akses mutlak ke WhatsApp API *logs*.
- **Admin:** Memiliki akses fleksibel (opsional) saat menetapkan *Assignee* di dokumen baru dan bisa bertindak mengunggah bukti/evidence langsung.
- **Teknisi:** Bertanggung jawab atas *task* dan merespons instruksi *deadline* yang dikirim ke aplikasi atau nomor WA mereka.
- **Pengunjung (Public):** Mengakses URL `/board` bermodalkan satu sandi global (*Access Code*) untuk memantau progres lewat papan ala Trello/JIRA berorientasi mobile.

## 3. Kebutuhan Spesifik & Pembaruan Arsitektur

### 3.1 Perubahan Skema Database (Prisma)
Penambahan pada skema (*Prisma schema*) meliputi:
1. **User Model:** Penambahan *field* `phone_number` untuk mendata kontak teknisi.
2. **Document Model:** Relasi `assignees` (via `DocumentAssignee`) kini bersifat **opsional** pada saat *create*.
3. **WhatsappSetting & WhatsappLog Model:** Untuk menyimpan kredensial token Fonnte dan *logging* keberhasilan pesan.
4. **SystemSetting Model:** (BARU)
   - Tabel dinamis *key-value pair*.
   - Menyimpan *record* `BOARD_ACCESS_CODE` untuk menampung kata sandi statis Kanban Publik.

### 3.2 Pembaruan Backend Service & Endpoint
1. **Middleware (`public.routes.js` - `checkBoardAccess`):**
   - Mencegat seluruh API `/public/*`.
   - Mengambil sandi dari `prisma.systemSetting.findUnique({ where: { key: 'BOARD_ACCESS_CODE' } })`. Jika tidak ada, fallback ke `process.env`.
2. **Settings API (`/api/settings`):**
   - `GET /api/settings/:key`
   - `PUT /api/settings/:key` (hanya Superadmin).
3. **Upload Evidence (`document.routes.js`):**
   - Validasi otorisasi di `POST /api/documents/:id/evidence` telah diperbarui dari semula hanya `teknisi` kini mengizinkan `admin` dan `superadmin` *role* (Bypass/Override privilege).
4. **Document Creation (`document.routes.js`):**
   - Modifikasi validasi di mana atribut `assignees` dapat menerima *array* kosong `[]` pada proses `create`.

### 3.3 Pembaruan Antarmuka (Frontend)
1. **Public Board (`/board`):**
   - Dirombak menjadi **Mobile-First Layout**:
   - Jika layar `max-width: 768px`: Kolom Kanban dikonversi menjadi barisan tombol *Pill Tabs* yang dapat di-*scroll* secara horizontal. Filter pencarian disembunyikan dalam laci layar bawah (*Drawer / Bottom Sheet*).
   - Penggunaan komponen `Drawer` dari sisi kanan/bawah untuk membedah detail *evidence* dokumen (menyembunyikan atribut "Nomor Dokumen" internal).
2. **Admin Layout (`/admin` & `/superadmin`):**
   - Implementasi `Bottom Navigation` dinamis untuk mempermudah navigasi menggunakan jempol saat dibuka di *smartphone*.
3. **Settings Form:**
   - Komponen `Accordion` di halaman `SystemSettings.tsx` untuk menyembunyikan *form* input sensitif saat tidak dimodifikasi.

## 4. Kebutuhan Non-Fungsional
1. **Security / Keamanan Data Publik:** Semua data di dalam Kanban Board harus bersifat *Read-Only* bagi pengunjung. Akses memanipulasi (*POST/PUT/DELETE*) harus tertutup rapat oleh `roleGuard`.
2. **User Experience (UX):** Transisi antara komponen *Desktop* (Horizontal Kanban) dan *Mobile* (Tab Kanban) harus terpicu seketika dengan transisi yang halus menggunakan `useMediaQuery` dari Mantine tanpa *refresh* halaman.
3. **Resilience / Fault Tolerance:** Jika MariaDB *timeout* saat memeriksa kata sandi Kanban dari *tabel*, sistem memiliki *fallback environment variable* yang memastikan pengunjung publik tetap bisa mengakses *Board*.
