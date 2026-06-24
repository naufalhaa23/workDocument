# Business Requirements Document (BRD)
## Aplikasi Monitoring Dokumen Kerja dan Pengelolaan Inventaris

**Perusahaan:** PT. Tri Agung Sinergi
**Tanggal:** 20 Juni 2026
**Status Dokumen:** Final / Terkini (Current State)

---

## 1. Ringkasan Eksekutif
Aplikasi Monitoring Dokumen Kerja dan Pengelolaan Inventaris dibangun untuk memfasilitasi operasional PT. Tri Agung Sinergi. Sistem ini membantu melacak pembuatan dokumen kerja (khususnya Sertifikat Negara atau SN), penugasan kepada teknisi, pemantauan status secara *real-time*, hingga pengelolaan informasi terkait kapal. Versi terbaru aplikasi telah diperbarui dengan kapabilitas yang meningkatkan komunikasi, visibilitas, dan kemudahan manajemen melalui integrasi WhatsApp otomatis, Kanban Board publik berkeamanan ganda, serta fungsionalitas manajemen tingkat mahir untuk Admin & Superadmin.

## 2. Latar Belakang Bisnis
Teknisi PT. Tri Agung Sinergi yang sering berada di lapangan membutuhkan informasi yang cepat dan *real-time* mengenai penugasan dan tenggat waktu (*deadline*) dokumen kerja. Selain itu, *stakeholder* internal maupun eksternal membutuhkan visibilitas cepat mengenai status dokumen secara portabel (via mobile). Sistem lama masih kaku terhadap alur kerja Admin, di mana penugasan harus langsung dilakukan di awal, dan Admin tidak bisa mengunggah bukti/berkas (*evidence*). Oleh karena itu, aplikasi diperbarui secara komprehensif agar lebih proaktif, aman, dan fleksibel (mobile-friendly).

## 3. Tujuan Bisnis
Tujuan utama dari sistem yang berjalan saat ini adalah:
1. **Mengurangi Keterlambatan Pengerjaan**: Meminimalisir keterlambatan penyerahan dokumen dengan pengingat otomatis via WhatsApp.
2. **Fleksibilitas Kerja Admin**: Memungkinkan Admin membuat dokumen tanpa teknisi awal, serta kebebasan bagi Admin untuk mengunggah berkas *evidence*.
3. **Meningkatkan Visibilitas Publik (Secure)**: Memungkinkan pihak-pihak terkait melihat progres dokumen kerja via *Mobile-friendly Kanban Board* yang dilapisi keamanan *Access Code*.
4. **Efisiensi Akses Mobile**: Mempercepat proses pembaruan status dan visibilitas data langsung dari antarmuka *smartphone* yang telah dioptimasi (seperti *Bottom Navigation* & *Drawer* detail).

## 4. Ruang Lingkup (Scope)
Sistem saat ini mencakup fungsionalitas berikut:
- **Manajemen Dokumen Kerja:** Pengelolaan data dokumen, informasi kapal, tenggat waktu, dan status secara *end-to-end* dengan *assignee* opsional.
- **Notifikasi WhatsApp (Fonnte API):** Pengingat *deadline*, pemberitahuan penugasan, dan perubahan status.
- **Secure Public Kanban Board:** Tampilan status progres dokumen bergaya JIRA dengan *tab mobile*, filter dinamis, dan *drawer* detail berkas, dilapisi pengamanan kode sandi (System Settings).
- **Mobile Admin & Teknisi Layout:** Navigasi aplikasi web yang responsif layaknya aplikasi *native* dengan *bottom navigation bar*.

## 5. Stakeholders
| Peran | Tanggung Jawab / Kepentingan |
| --- | --- |
| **Manajemen PT. Tri Agung Sinergi** | Memantau kinerja operasional, SLA teknisi, dan keberhasilan penyelesaian dokumen kerja. |
| **Admin / Superadmin** | Mengelola dokumen, mengunggah *evidence*, mengatur kode akses Kanban, memantau *log* WhatsApp, dan memberikan penugasan (fleksibel). |
| **Teknisi** | Menerima notifikasi otomatis (WA), mengelola profil, serta menyelesaikan dokumen sesuai tenggat waktu. |
| **Klien / Pihak Eksternal** | Memantau progres dokumen kerja dari kapal mereka melalui papan *Kanban* publik dengan kode akses. |

## 6. Kebutuhan Fungsional (Functional Requirements)

Berikut adalah fitur dan kebutuhan fungsional terkini yang telah diimplementasikan dalam sistem:

### 6.1. Fitur Notifikasi WhatsApp (Fonnte API)
| ID | Deskripsi | Status |
| --- | --- | --- |
| **FR-WA-01** | Sistem mengirimkan pengingat *deadline* penyelesaian dokumen secara otomatis pada H-10, H-3, dan H-1. | Terimplementasi |
| **FR-WA-02** | Pesan otomatis ke nomor teknisi saat terjadi **penugasan baru**. | Terimplementasi |
| **FR-WA-03** | Pesan otomatis saat terjadi **perubahan status dokumen**. | Terimplementasi |

### 6.2. Manajemen & Pengaturan oleh Admin/Superadmin
| ID | Deskripsi | Status |
| --- | --- | --- |
| **FR-ADM-01** | Halaman `/admin/whatsapp-settings` untuk mengatur Token API Fonnte dan *toggle* status. | Terimplementasi |
| **FR-ADM-02** | Pengaturan **Sistem Settings** eksklusif bagi Superadmin untuk mengubah *Board Access Code* secara dinamis tanpa mengubah kodingan. | Terimplementasi |
| **FR-ADM-03** | **Admin Mobile Bottom Nav:** Tampilan antarmuka *smartphone* bagi Admin yang dilengkapi menu navigasi praktis di bawah layar. | Terimplementasi |

### 6.3. Manajemen Dokumen Lanjutan
| ID | Deskripsi | Status |
| --- | --- | --- |
| **FR-DOC-01** | **Assignee Opsional:** Admin/Superadmin dapat membuat atau mengubah dokumen tanpa harus segera memilih teknisi. | Terimplementasi |
| **FR-DOC-02** | **Upload Evidence Admin:** Admin dan Superadmin memiliki akses *bypass* untuk secara langsung mengunggah file *evidence* dokumen tanpa perlu _login_ sebagai teknisi. | Terimplementasi |
| **FR-DOC-03** | Pembaruan status dokumen dapat dilakukan secara instan (*Inline Status Update*) melalui tabel dokumen. | Terimplementasi |

### 6.4. Secure Public Kanban Webview (`/board`)
| ID | Deskripsi | Status |
| --- | --- | --- |
| **FR-PUB-01** | Halaman *Kanban board* publik (`/board`) dengan keamanan **Access Code** sebelum dapat diakses. | Terimplementasi |
| **FR-PUB-02** | Tampilan *Mobile Tab-Based*: Pada layar sempit, kolom papan otomatis berubah menjadi menu *Pill Button* dinamis untuk efisiensi layar. | Terimplementasi |
| **FR-PUB-03** | **Drawer Detail Panel:** Mengklik kartu dokumen akan memunculkan layar samping (*bottom-sheet/drawer*) untuk melihat detail dokumen dan membedah file lampiran. | Terimplementasi |
| **FR-PUB-04** | Fitur Pencarian dan Filter berdasarkan lokasi/nama kapal yang dikemas ke dalam *Mobile Bottom Sheet* yang modern. | Terimplementasi |

## 7. Batasan dan Asumsi
**Batasan:**
- Eksekusi pesan WA sangat bergantung pada koneksi *server* dan kuota Fonnte API.
- File evidence fisik yang diunggah disimpan pada *local storage server* sehingga memerlukan ruang *disk* (VPS) yang memadai.

**Asumsi:**
- Superadmin tidak mendistribusikan *Access Code* Kanban ke pihak yang tidak berkepentingan secara sembarangan.

## 8. Kriteria Keberhasilan (Success Criteria)
- Sistem berjalan responsif di perangkat mobile dan desktop untuk semua jenis user (*Role*).
- Klien eksternal bisa dengan mudah mengecek progres via *board* menggunakan sandi tanpa harus memiliki akun.
- Fleksibilitas tugas Admin meningkat secara signifikan (bisa unggah berkas sendiri, navigasi via mobile lebih cepat).
