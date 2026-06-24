# Product Requirements Document (PRD)

## 1. Pendahuluan
**Aplikasi Monitoring Dokumen Kerja dan Pengelolaan Inventaris** (PT. Tri Agung Sinergi) adalah platform operasional internal yang secara berkelanjutan mengalami peningkatan. Versi terbaru (Current State) memperkenalkan perombakan besar dari segi *User Experience* (UX) responsif, fungsionalitas manajemen *backend*, komunikasi otomatis via WhatsApp, serta integrasi pemantauan publik menggunakan *Board Kanban* yang dibekali mekanisme keamanan kode dinamis.

## 2. Masalah yang Diselesaikan
1. **Komunikasi & Reminder Kaku:** Mengandalkan pengecekan manual *website* atau notifikasi *in-app* sering mengakibatkan keterlambatan teknisi dalam menyadari tugas baru atau batas waktu dokumen.
2. **Keterbatasan Visibilitas Klien:** Tidak ada platform terintegrasi bagi klien eksternal untuk memantau pengerjaan dokumen kapal tanpa akun khusus.
3. **Workflow Kaku untuk Admin:** Admin di versi lama harus segera memilih teknisi saat membuat dokumen dan tidak diizinkan membantu mengunggah bukti (*evidence*). Ini sangat membatasi kecepatan administrasi.
4. **Pengalaman Pengguna Layar Kecil (Mobile):** Antarmuka pengguna sangat sulit dioperasikan melalui *smartphone*, baik untuk Kanban maupun pengelolaan oleh Admin.

## 3. Tujuan Produk
- Membangun ekosistem informasi yang proaktif (WA Notification).
- Menghadirkan transparansi progres kerja kepada pihak ketiga tanpa mengorbankan keamanan data internal (*Secure Public Kanban*).
- Menghadirkan fleksibilitas mutlak bagi Administrator dalam memanipulasi *evidence* dan pendelegasian tugas secara fleksibel (*Optional Assignee* & *Admin Override Upload*).
- Menjamin responsivitas UI dengan pendekatan *Mobile-First Design* (contoh: *Bottom Navigation*, *Bottom Sheet Filter*, *Tabs/Pills*).

## 4. Fitur dan Kebutuhan Fungsional

### 4.1. WhatsApp Notification Engine (Fonnte API)
| ID | Nama Fitur | Keterangan |
| --- | --- | --- |
| **FR-001** | *Deadline Reminder* WA | Mengirimkan *reminder* otomatis H-10, H-3, H-1 melalui *cron job*. |
| **FR-002** | *Task & Status Alert* | Memicu notifikasi saat penugasan baru atau perpindahan status (proses → menunggu izin → dsb). |
| **FR-003** | WA Settings (Superadmin) | UI Pengaturan Fonnte API Key, status On/Off sistem, dan riwayat pesan terkirim. |

### 4.2. Secure Public Kanban Board (`/board`)
| ID | Nama Fitur | Keterangan |
| --- | --- | --- |
| **FR-004** | *Dynamic Access Code* | Pengunjung Kanban publik diwajibkan memasukkan "Kode Akses" yang valuasinya disimpan secara aman di *database* (`SystemSetting`), bukan hardcode `.env`. |
| **FR-005** | *Mobile Tab-Based UI* | Layout Kanban berubah dari *scroll* vertikal/horizontal menjadi sistem navigasi tab *Pill-button* saat diakses dari *smartphone*. |
| **FR-006** | *Bottom Sheet Filter* | Fitur pencarian dan filter *dropdown* dikemas menjadi *Bottom Sheet Drawer* di layar *mobile* untuk menghemat layar. |
| **FR-007** | *Detail Drawer Panel* | Mengklik kartu Kanban memunculkan panel melayang (dari samping kanan untuk desktop, atau bawah untuk mobile) menampilkan detail rinci dan status lampiran. |

### 4.3. Advanced Admin Controls
| ID | Nama Fitur | Keterangan |
| --- | --- | --- |
| **FR-008** | *Optional Document Assignee* | Saat Admin membuat dokumen, pilihan teknisi (*Assignee*) bisa dikosongkan untuk ditentukan nanti. |
| **FR-009** | *Admin Override Evidence* | Admin & Superadmin memiliki keistimewaan (*privilege*) untuk bisa langsung mengunggah file bukti (*evidence*) dokumen layaknya Teknisi. |
| **FR-010** | *Admin Mobile Bottom Nav* | Implementasi *bottom navigation bar* yang dinamis di *smartphone* khusus *role* Admin & Superadmin agar mudah mengakses modul-modul esensial. |
| **FR-011** | *System Settings GUI* | Halaman manajemen variabel global (misal: Kanban Board Code) berbasis *Database* yang hanya bisa diubah oleh Superadmin. |

## 5. User Stories

**Sebagai Superadmin:**
- Saya ingin sebuah halaman Pengaturan Sistem untuk mengganti *Access Code* Kanban Publik kapan pun diperlukan tanpa melakukan intervensi ke *source code* *server*.
- Saya ingin bisa membuat kerangka dokumen kerja baru meskipun belum tahu siapa Teknisi yang akan saya tunjuk.

**Sebagai Admin:**
- Saya ingin bisa mengunggah berkas sertifikat atau *evidence* dari laptop saya ke sebuah dokumen tanpa harus melempar wewenang tersebut ke Teknisi terlebih dahulu.
- Saya ingin menavigasikan aplikasi via *smartphone* saat *mobile* dengan mudah menggunakan menu *Bottom Navigation* alih-alih mencari *hamburger menu*.

**Sebagai Klien / Pengunjung Publik:**
- Saya ingin mengecek secara mandiri dokumen kapal saya sudah berada di fase apa tanpa memboroskan ruang layar HP saya (menggunakan tab/filter layar yang *smooth*).

**Sebagai Teknisi:**
- Saya ingin diberi tahu lewat WhatsApp saya apabila *deadline* dokumen yang saya pegang sudah semakin dekat agar saya tidak perlu *standby* di website seharian.

## 6. Kebutuhan Non-Fungsional (NFR)
- **Security:** *Access code* dilindungi oleh pengecekan berlapis (Database prioritas, lalu *fallback process.env*). Data WhatsApp Token terenkripsi dalam implementasi *server*.
- **Usability (Mobile-First):** Pemanfaatan komponen Mantine v7 secara dinamis menggunakan *hook* `useMediaQuery` untuk transisi komponen dari Desktop ke Mobile yang mulus.
- **Reliability:** Perubahan sistem pengunduhan file dan *upload evidence* tetap stabil sekalipun dilakukan dari jaringan 4G *mobile*.

## 7. Desain Antarmuka (UI/UX) Terkini
1. **Public Board:** 
   - *Desktop:* Barisan kolom horizontal secara leluasa dengan komponen indikator jumlah dokumen (misal: "4 Dokumen"). 
   - *Mobile:* Komponen *Pill Tabs* berwarna biru responsif, ditambah *Bottom Sheet* filter dengan indikator *badge*.
2. **Detail Panel:** *Slide-out Drawer* rapi yang menyembunyikan identitas/nomor dokumen internal, difokuskan pada lampiran fisik.
3. **Admin Layout:** Navigasi bawah persis seperti versi Teknisi, dengan *routing* ke halaman *Dashboard, Dokumen, Approvals, Users*.
