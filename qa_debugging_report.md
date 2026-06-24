# Laporan QA & Debugging Menyeluruh: Manajemen Dokumen & Inventaris

Berdasarkan tinjauan komprehensif terhadap `schema.prisma`, controller backend (`document.routes.js`, `upload.routes.js`, `auth.js`), dan komponen React frontend (`ManajemenDokumen.tsx`, `UploadEvidence.tsx`, `ApprovalQueue.tsx`), berikut adalah Audit Logika Sistem Menyeluruh.

---

## A. Kerentanan RBAC & Keamanan
**Fokus:** Mencegah `Teknisi` melewati (bypass) logika frontend/backend.

### 1. `Teknisi` Dapat Mengunggah Evidence ke Dokumen APAPUN
**Kerentanan:** Pada `POST /api/uploads/files` (`upload.routes.js`), backend tidak memverifikasi apakah `req.user.id` benar-benar ditugaskan pada `document_id` tersebut. Seorang Teknisi yang iseng/berniat buruk dapat memodifikasi *body* request POST dan mengunggah file untuk dokumen yang ditugaskan kepada orang lain.
**Bypass:** Selain itu, tidak ada validasi status dokumen. Seorang Teknisi dapat mengunggah evidence meskipun status dokumen tersebut BUKAN `upload_diizinkan`.

### 2. Permintaan Izin yang Tidak Sah
**Kerentanan:** Pada `POST /api/uploads/request-permission`, tidak ada validasi untuk memeriksa apakah dokumen tersebut adalah milik Teknisi yang meminta izin. Mereka bisa sembarangan mengubah status dokumen apapun menjadi `menunggu_izin`.

---

## B. Bug Integrasi Lintas File
**Fokus:** Ketidaksesuaian antara pemanggilan API dari React, routing backend, dan tabel database.

### 1. Update Dokumen yang Tidak Atomik
**Bug:** Pada `ManajemenDokumen.tsx`, fungsi `handleUpdateDocument` melakukan dua request HTTP terpisah untuk proses edit:
1. `api.put( /documents/${id} )` untuk memperbarui metadata & assignees.
2. `api.patch( /documents/${id}/status )` untuk memperbarui status.
**Dampak:** Hal ini merusak prinsip atomisitas database. Jika koneksi terputus di antara request 1 dan 2, sistem akan mengalami *race condition* di mana metadata diperbarui namun notifikasi status (`socket.io`) gagal terkirim. Selain itu, ini akan memicu *spam* dua entri `ActivityLog` yang berbeda.

### 2. Pemetaan Warna Status
*Enum* status dari Prisma memiliki nilai: `proses`, `menunggu_izin`, `upload_diizinkan`, `draft_sn`, `assigned`. 
Pemetaan `STATUS_CONFIG` pada frontend sudah sangat cocok dan tidak ada masalah. Walaupun `UploadPermission` menggunakan enum berbeda (`pending`, `approved`, `rejected`), hal ini juga sudah dipetakan dengan benar di layar `ApprovalQueue.tsx`. Tidak ditemukan ketidaksesuaian yang parah di sini.

---

## C. Edge Cases pada Alur Kerja (Workflow) & Pemicu (Trigger)
**Fokus:** Alur 3-tahap ("Proses" -> "Draft SN" -> "Assigned") dan pengingat batas waktu (deadline).

### 1. Fitur *Bypass* pada State Machine Alur Kerja
**Bug:** Persyaratan skripsi secara spesifik menyatakan "Dokumen harus bergerak berurutan dari Proses -> Draft SN -> Assigned." 
Saat ini, backend `PATCH /api/documents/:id/status` mengizinkan seorang `admin` untuk mengubah dokumen dari `proses` langsung menjadi `assigned` tanpa syarat, sehingga melewatkan tahap `draft_sn` secara menyeluruh dan menghindari pengisian deadline.

### 2. Deadline Pasif (Trigger Tidak Berjalan)
**Bug:** Batas waktu (`deadline_sn`) memang tersimpan di database, tetapi **tidak ada Cron Job atau *worker* aktif** yang mendorong notifikasi ketika tenggat waktu tersebut telah tiba. Pengguna hanya menerima notifikasi saat admin *secara manual mengubah* status. Ini berarti syarat "Pengingat deadline harus aktif secara spesifik pada tahap Draft SN" akan gagal terpenuhi apabila waktu habis dengan sendirinya (pasif).

---

## D. Kualitas Kode Setingkat Skripsi & Efisiensi React

1. **In-efisiensi Rendering:** `ApprovalQueue.tsx` secara dinamis menghitung *badge tab* (`uploadRequests.length + inventoryRequests.length`). Jika beban request yang dimuat cukup besar, kalkulasi yang tidak menggunakan *memoize* ini memicu sedikit pergeseran *layout* saat terjadi *re-rende*r.
2. **Kurangnya Pendekatan Optimistic UI:** `UploadEvidence.tsx` memaksa pengguna menunggu hingga request `await api.post` selesai sebelum pengguna dialihkan (navigate back). Menggunakan *wrapper* Optimistic UI dapat mempercepat persepsi kinerja (UX) aplikasi yang lebih mulus.
3. **Skalabilitas Database:** Pada `document.routes.js`, pengambilan data assignees memuat relasi penuh menggunakan `include`. Seiring membesarnya tabel dokumen, pengambilan struktur *tree* tanpa membatasi lingkup seleksi kolom (menggunakan `select`) lambat laun akan menyebabkan masalah pada batas memori.

---

## E. Solusi yang Dapat Diterapkan & Snippet Kode

### Solusi 1: Mengamankan `upload.routes.js` (Menutup Celah RBAC)
Ubah routing `POST /api/uploads/files` untuk menerapkan validasi *assignment* secara ketat:
```javascript
// POST /api/uploads/files
router.post('/files', auth, roleGuard('teknisi'), upload.array('files', 5), async (req, res, next) => {
  try {
    const { document_id, notes } = req.body;
    
    // [PERBAIKAN] Penjagaan Validasi Ketat
    const docInfo = await prisma.document.findUnique({
      where: { id: Number(document_id) },
      include: { assignees: true }
    });

    if (!docInfo) return res.status(404).json({ message: 'Dokumen tidak ditemukan' });

    const isAssigned = docInfo.assignees.some(a => a.user_id === req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ message: 'Anda tidak ditugaskan pada dokumen ini.' });
    }

    if (docInfo.status !== 'upload_diizinkan') {
      return res.status(403).json({ message: 'Status dokumen belum diizinkan untuk upload.' });
    }

    // Lanjutkan dengan logika pengunggahan...
    const uploads = [];
```

### Solusi 2: Menggabungkan PUT & PATCH di Frontend (`ManajemenDokumen.tsx`)
Alih-alih menggandakan panggilan HTTP, gabungkan logika status ke dalam request PUT di backend `document.routes.js` ATAU dengan memfaktorkan ulang `handleUpdateDocument` pada frontend:
```tsx
const oldDeadline = selectedDoc.deadline_sn ? dayjs(selectedDoc.deadline_sn).toISOString() : null;
const newDeadline = formDeadline ? dayjs(formDeadline).toISOString() : null;

// Routing PUT Backend juga harus dimodifikasi untuk menerima parameter status/deadline.
await api.put(`/documents/${selectedDoc.id}`, {
  document_type: formType,
  document_number: formNumber,
  document_date: formDate ? dayjs(formDate).toISOString() : undefined,
  title: formTitle,
  assignees: formTeknisi,
  // Tambahkan ke body PUT agar backend mengupdate keseluruhan secara atomik (bersamaan)
  status: formStatus !== selectedDoc.status ? formStatus : undefined,   
  deadline_sn: newDeadline !== oldDeadline ? newDeadline : undefined 
});
```

### Solusi 3: Menegakkan Alur Kerja Secara Berurutan (Sequential Workflows)
Untuk mencegah admin melompati tahap `Draft SN`, tambahkan pengecekan *state machine* di dalam `document.routes.js` pada *route* `PATCH /status`:
```javascript
router.patch('/:id/status', auth, roleGuard('admin', 'superadmin'), async (req, res, next) => {
  const { status, deadline_sn } = req.body;
  const currentDoc = await prisma.document.findUnique({ where: { id: Number(req.params.id) } });

  // Pagar Penjaga Sequence (Berurutan)
  const validTransitions = {
    'proses': ['menunggu_izin', 'draft_sn'],
    'menunggu_izin': ['upload_diizinkan', 'proses'],
    'upload_diizinkan': ['draft_sn'],
    'draft_sn': ['assigned', 'proses']
  };

  if (!validTransitions[currentDoc.status].includes(status)) {
    return res.status(400).json({ 
       message: `Urutan workflow diubah melanggar aturan. Transisi ${currentDoc.status} -> ${status} tidak diizinkan.` 
    });
  }
  
  // Lanjutkan menyimpan update...
```

### Solusi 4: Worker Cron Aktif untuk Deadline Draft SN
Untuk memastikan notifikasi pengingat muncul otomatis tanpa harus menekan tombol manual, buat sebuah Cron worker pasif menggunakan Node.js (misal, dengan *package* `node-cron`):
```javascript
const cron = require('node-cron');
const prisma = require('../config/database');

// Berjalan setiap tengah malam
cron.schedule('0 0 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Cari dokumen berstatus Draft SN yang tenggat waktunya sangat dekat
  const dueDocs = await prisma.document.findMany({
    where: {
      status: 'draft_sn',
      deadline_sn: {
        lte: tomorrow,
        gte: new Date()
      }
    },
    include: { assignees: true }
  });

  dueDocs.forEach(async (doc) => {
    // Kirim notifikasi otomatis
    doc.assignees.forEach(async (assignee) => {
      await createNotification({
        userId: assignee.user_id, 
        title: 'Peringatan Deadline',
        message: `Deadline untuk dokumen ${doc.document_number} kurang dari 24 jam!`,
        type: 'deadline_warning', 
        referenceType: 'document', 
        referenceId: doc.id,
      });
    });
});
```

---

## F. Perbaikan UI/UX Frontend & Tata Letak (Layout)
**Fokus:** Mengoptimalkan Kanban Board (`PublicBoard.tsx`) agar setara dengan standar dasbor SaaS modern (Linear, Monday, Jira).

### 1. Masalah Tata Letak Terkompresi (Horizontal Scrolling)
**Bug Sebelumnya:** Komponen `ScrollArea` dan lebar tetap (`width: 320, flexShrink: 0`) pada kolom menyebabkan kolom kelima (`SELESAI`) tidak terlihat di layar standar tanpa melakukan *scroll* horizontal.
**Penyelesaian:** 
- Menggunakan `Container fluid` agar papan memanfaatkan 100% lebar layar.
- Mengatur *wrapper* kolom menjadi `flex: '1 1 0'` (flex-grow 1, flex-basis 0) dan `minWidth: 0` agar layar dibagi secara adil ke dalam 5 kolom (masing-masing ~20% dari lebar layar).

### 2. Isyarat Interaksi yang Membingungkan (Drag-and-Drop Semu)
**Bug Sebelumnya:** Saat kursor diletakkan (*hover*) di atas kartu tugas, kursor berubah menjadi `cursor-grab` (ikon tangan menggenggam), dan memberikan efek animasi melompat (`translateY(-2px)`) serta bayangan tebal. Ini menipu pengguna untuk mengira bahwa aplikasi mendukung fitur *drag-and-drop*.
**Penyelesaian:**
- Mengganti kursor menjadi standar `cursor-pointer`.
- Menghapus efek elevasi bayangan (shadow) berlebihan. Sebagai gantinya, latar belakang kartu diatur agar sedikit menggelap (menjadi `gray-50`) ketika disorot (*subtle hover state*).

### 3. Hierarki Visual dan Detail Estetika
- **Latar Belakang Kolom (Lane Background):** Menambahkan warna latar abu-abu pudar pada kontainer kolom. Dengan demikian, kartu putih murni kini terlihat "mengapung" (*pop-out*) di atas jalurnya, bukan sekadar melayang di ruang kosong.
- **Pembersihan Ikon:** Ikon `+` pada *header* kolom dan ikon `...` (*MoreOptions*) pada kartu dihapus untuk menciptakan ruang *whitespace* yang lebih lega dan fokus pada informasi inti (Judul, Lokasi, Status, dan Tanggal).
