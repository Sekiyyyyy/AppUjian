package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gorm.io/datatypes"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
)

type SimQuestion struct {
	Content string
	Options map[string]string
	Answer  string
	Points  int
}

func main() {
	cfg := config.LoadConfig()
	config.ConnectDB(cfg)
	db := config.DB

	fmt.Println("🚀 Memulai penyiapan Bank Soal dan Jadwal Simulasi CBT untuk SELURUH KELAS...")

	// 1. Dapatkan Mata Pelajaran ID 78 ("Soal Simulasi")
	var subject models.Subject
	if err := db.First(&subject, 78).Error; err != nil {
		// Buat jika tidak ada
		subject = models.Subject{
			Name:     "Soal Simulasi",
			Code:     "SIM-ALL-2026",
			Type:     "JURUSAN",
			Class:    "Semua Kelas",
			Tahun:    "2026/2027",
			Semester: "Ganjil",
		}
		if err := db.Create(&subject).Error; err != nil {
			log.Fatalf("Gagal membuat subject simulasi: %v", err)
		}
	}
	fmt.Printf("Mata Pelajaran: %s (ID: %d)\n", subject.Name, subject.ID)

	// 2. Dapatkan Kategori
	var category models.Category
	if err := db.First(&category, 1).Error; err != nil {
		category = models.Category{Name: "Simulasi Bersama"}
		db.Create(&category)
	}

	// 3. Dapatkan User Admin (ID 1)
	var adminUser models.User
	if err := db.First(&adminUser, 1).Error; err != nil {
		db.Where("role = ?", models.RoleAdmin).First(&adminUser)
	}

	// 4. 50 Butir Soal Lengkap Simulasi CBT
	questionsList := []SimQuestion{
		// BAGIAN 1: FITUR & TATA TERTIB CBT UJIAN
		{
			Content: "Fitur keamanan Kiosk Mode pada aplikasi CBT SMKN 1 Beringin berfungsi untuk...",
			Options: map[string]string{
				"A": "Menutup aplikasi secara otomatis setiap 5 menit.",
				"B": "Mengunci layar ujian ke mode layar penuh, menonaktifkan tombol sistem, dan mendeteksi upaya keluar aplikasi.",
				"C": "Mengirimkan pesan otomatis ke ponsel orang tua siswa.",
				"D": "Mematikan koneksi internet ponsel secara permanen.",
				"E": "Membuka browser otomatis untuk mencari referensi jawaban.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Apabila status sesi ujian Anda berubah menjadi 'LOCKED' (Terkunci), tindakan yang harus Anda lakukan adalah...",
			Options: map[string]string{
				"A": "Merestart ponsel dan membuat akun siswa baru.",
				"B": "Menghapus aplikasi dan mengunduh ulang APK.",
				"C": "Melapor secara tertib kepada Pengawas Ruang / Proktor untuk verifikasi dan pembukaan kunci sesi.",
				"D": "Menekan tombol daya secara berulang-ulang hingga kunci terbuka.",
				"E": "Meninggalkan ruang ujian tanpa memberitahu pengawas.",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Pada antarmuka pengerjaan soal ujian CBT, tombol 'Ragu-Ragu' (tanda kuning) digunakan untuk...",
			Options: map[string]string{
				"A": "Menghapus nomor soal dari daftar ujian.",
				"B": "Menandai butir soal yang jawabannya belum yakin agar mudah ditinjau kembali sebelum submit akhir.",
				"C": "Meminta bantuan kunci jawaban dari proktor.",
				"D": "Menghentikan waktu hitung mundur ujian sementara waktu.",
				"E": "Menggandakan nilai poin soal tersebut.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Apa yang terjadi apabila waktu pengerjaan ujian (countdown timer) telah habis (00:00)?",
			Options: map[string]string{
				"A": "Seluruh jawaban siswa akan terhapus dan nilai otomatis 0.",
				"B": "Sistem secara otomatis mengumpulkan (auto-submit) seluruh jawaban yang telah dipilih ke server.",
				"C": "Ujian diulang kembali dari nomor 1 secara otomatis.",
				"D": "Ponsel siswa akan terkunci permanen dan tidak bisa digunakan.",
				"E": "Siswa diberikan tambahan waktu bebas tanpa batas.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Pada lembar navigasi daftar nomor soal CBT, nomor soal yang telah dijawab dengan yakin akan ditandai dengan warna...",
			Options: map[string]string{
				"A": "Abu-abu",
				"B": "Kuning",
				"C": "Hijau",
				"D": "Merah",
				"E": "Ungu",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Mekanisme proteksi layar 'FLAG_SECURE' pada aplikasi ujian CBT bertujuan untuk mencegah...",
			Options: map[string]string{
				"A": "Penggunaan kalkulator di meja ujian.",
				"B": "Tindakan tangkapan layar (screenshot) dan perekaman layar (screen record) selama ujian berlangsung.",
				"C": "Kerusakan baterai perangkat ponsel pintar siswa.",
				"D": "Masuknya panggilan telepon masuk dari luar.",
				"E": "Penurunan tingkat kecerahan layar ponsel.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Mengapa siswa dilarang menyentuh jendela mengambang (Floating Window) atau notifikasi saat sesi ujian aktif?",
			Options: map[string]string{
				"A": "Karena aplikasi akan mematikan daya ponsel seketika.",
				"B": "Karena sistem akan mendeteksi hilangnya fokus jendela ujian sebagai indikasi kecurangan dan mengunci ujian.",
				"C": "Karena kuota internet sekolah akan berkurang drastis.",
				"D": "Karena kamera depan akan mengambil foto siswa terus-menerus.",
				"E": "Karena durasi ujian akan berkurang 30 menit otomatis.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Fitur sirine alarm pada aplikasi ujian Android akan berbunyi dengan suara keras jika...",
			Options: map[string]string{
				"A": "Siswa menjawab soal dengan jawaban yang salah.",
				"B": "Siswa menekan tombol Back atau berusaha keluar ke layar Beranda/aplikasi lain saat layar masih menyala.",
				"C": "Siswa menekan tombol nomor soal terlalu cepat.",
				"D": "Siswa menghidupkan mode gelap pada ponsel.",
				"E": "Siswa menyelesaikan ujian sebelum waktu habis.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Sebelum menekan tombol 'Selesai / Kumpulkan Ujian', hal terpenting yang wajib dipastikan oleh peserta adalah...",
			Options: map[string]string{
				"A": "Memastikan seluruh nomor soal telah terjawab dan tidak ada lagi tanda ragu-ragu yang tersisa.",
				"B": "Menghapus riwayat cache aplikasi terlebih dahulu.",
				"C": "Mematikan koneksi internet ponsel.",
				"D": "Mengubah pengaturan bahasa pada ponsel ke bahasa Inggris.",
				"E": "Memberitahu seluruh teman sekelas bahwa ujian sudah selesai.",
			},
			Answer:  "A",
			Points:  2,
		},
		{
			Content: "Kewenangan untuk membuka kembali kunci ujian peserta (Unlock Exam) yang terkena pelanggaran berada pada...",
			Options: map[string]string{
				"A": "Ketua kelas masing-masing rombel.",
				"B": "Guru Pengawas Ruang / Proktor yang bertugas di ruangan tersebut.",
				"C": "Petugas keamanan gerbang sekolah.",
				"D": "Operator seluler penyedia jaringan internet.",
				"E": "Orang tua / wali murid peserta didik.",
			},
			Answer:  "B",
			Points:  2,
		},

		// BAGIAN 2: LITERASI MEMBACA & BAHASA INDONESIA
		{
			Content: "Bacalah kutipan berikut: 'Penerapan standar operasional prosedur (SOP) di lingkungan industri kejuruan bertujuan meminimalkan risiko kecelakaan kerja dan menjamin konsistensi mutu produk akhir.' Ide pokok kutipan tersebut adalah...",
			Options: map[string]string{
				"A": "Biaya tinggi dalam penerapan standar operasional prosedur.",
				"B": "Tujuan penerapan SOP dalam meminimalkan kecelakaan dan menjaga mutu produk.",
				"C": "Perbedaan antara lingkungan industri dan lingkungan sekolah.",
				"D": "Jenis-jenis kecelakaan kerja yang sering terjadi di industri.",
				"E": "Tanggung jawab pekerja baru terhadap pimpinan perusahaan.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Makna istilah 'efisiensi operasional' dalam konteks manajemen kerja adalah...",
			Options: map[string]string{
				"A": "Pengurangan jumlah pegawai tanpa memperhatikan target produksi.",
				"B": "Kemampuan menghasilkan output maksimal dengan pemanfaatan waktu, tenaga, dan biaya yang hemat serta tepat guna.",
				"C": "Penggunaan mesin otomatis tanpa pengawasan manusia.",
				"D": "Pembelian bahan baku murah tanpa standar kualitas.",
				"E": "Pemberhentian seluruh aktivitas produksi saat jam istirahat.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Penulisan kalimat berikut yang memenuhi kaidah kalimat efektif dan ejaan bahasa Indonesia yang baku adalah...",
			Options: map[string]string{
				"A": "Bagi para siswa-siswa yang terlambat harap menunggu di depan gerbang.",
				"B": "Kepala sekolah menugaskan panitia ujian untuk menyusun jadwal asesmen.",
				"C": "Soal ujian tersebut sangat sulit sekali sehingga tidak dapat dikerjakan.",
				"D": "Di dalam rapat itu membicarakan tentang jadwal ujian semester.",
				"E": "Pekerjaan itu diselesaikan oleh daripada tim teknis sekolah.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Manakah pernyataan di bawah ini yang merupakan sebuah FAKTA, bukan opini?",
			Options: map[string]string{
				"A": "SMK Negeri 1 Beringin merupakan sekolah paling indah di Kabupaten Deli Serdang.",
				"B": "Aplikasi CBT berbasis mobile sangat mudah digunakan oleh seluruh generasi.",
				"C": "Ujian Berbasis Komputer (CBT) di SMKN 1 Beringin dilaksanakan menggunakan sistem aplikasi digital terintegrasi.",
				"D": "Soal-soal ujian matematika selalu terasa lebih membosankan dibanding sejarah.",
				"E": "Semua siswa pasti menyukai ujian menggunakan ponsel pintar.",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Konjungsi subordinatif yang menyatakan hubungan 'sebab-akibat' yang tepat terdapat pada kalimat...",
			Options: map[string]string{
				"A": "Peserta mempersiapkan alat tulis, lalu duduk di tempat yang ditentukan.",
				"B": "Siswa tidak dapat mengakses lembar soal karena sesi ujian belum diaktifkan oleh pengawas.",
				"C": "Ujian dapat dikerjakan di laptop ataupun di ponsel pintar.",
				"D": "Meskipun cuaca hujan lebat, seluruh peserta tetap hadir tepat waktu.",
				"E": "Proktor mengumumkan peraturan agar seluruh peserta tertib.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Penulisan kata serapan bahasa asing ke dalam bahasa Indonesia baku yang tepat adalah...",
			Options: map[string]string{
				"A": "Kwalitas dan sistim",
				"B": "Kualitas dan sistem",
				"C": "Kwalitet dan sistim",
				"D": "Kwalitas dan sistematisasi",
				"E": "Kwaliti dan sistim",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Dalam penulisan surat lamaran pekerjaan resmi, salam pembuka yang paling lazim dan tepat digunakan adalah...",
			Options: map[string]string{
				"A": "Halo Bapak/Ibu HRD,",
				"B": "Dengan hormat,",
				"C": "Selamat pagi semuanya,",
				"D": "Kepada Yth. Pimpinan,",
				"E": "Salam sejahtera selalu,",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Bacalah teks petunjuk: '1) Pasang kabel daya. 2) Pastikan indikator lampu menyala hijau. 3) Tekan tombol power selama 3 detik. 4) Tunggu proses booting selesai.' Teks tersebut termasuk jenis teks...",
			Options: map[string]string{
				"A": "Teks Narasi",
				"B": "Teks Prosedur",
				"C": "Teks Eksplanasi",
				"D": "Teks Anekdot",
				"E": "Teks Eksposisi",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Antonim yang paling tepat untuk kata 'Transparan' dalam konteks tata kelola organisasi adalah...",
			Options: map[string]string{
				"A": "Jelas",
				"B": "Terbuka",
				"C": "Tertutup (Rahasiasi)",
				"D": "Mudah",
				"E": "Nyata",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Kutipan: 'Kegagalan bukan akhir perjalanan, melainkan umpan balik berharga untuk memperbaiki strategi berikutnya.' Simpulan pesan moral kutipan tersebut adalah...",
			Options: map[string]string{
				"A": "Kegagalan harus dihindari dengan cara apa pun.",
				"B": "Sikap pantang menyerah dan kemauan belajar dari kesalahan merupakan kunci perbaikan diri.",
				"C": "Strategi baru hanya dibuat saat proyek berhasil.",
				"D": "Orang yang gagal sebaiknya berhenti mencoba.",
				"E": "Kesalahan adalah tanggung jawab bersama pimpinan.",
			},
			Answer:  "B",
			Points:  2,
		},

		// BAGIAN 3: NUMERASI & LOGIKA PENALARAN
		{
			Content: "Sebuah toko seragam kejuruan memberikan diskon 20% untuk pembelian baju praktik seharga Rp150.000,00. Berapakah nominal yang harus dibayar pembeli setelah diskon?",
			Options: map[string]string{
				"A": "Rp110.000,00",
				"B": "Rp120.000,00",
				"C": "Rp125.000,00",
				"D": "Rp130.000,00",
				"E": "Rp135.000,00",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Jika 4 orang teknisi dapat menyelesaikan instalasi jaringan di laboratorium komputer dalam waktu 6 hari, berapa hari yang dibutuhkan jika pekerjaan tersebut dikerjakan oleh 8 orang teknisi dengan kecepatan kerja sama?",
			Options: map[string]string{
				"A": "2 hari",
				"B": "3 hari",
				"C": "4 hari",
				"D": "5 hari",
				"E": "8 hari",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Pada denah skala 1 : 200, panjang sebuah bengkel praktik adalah 6 cm. Berapakah panjang sebenarnya bengkel tersebut di lapangan?",
			Options: map[string]string{
				"A": "6 meter",
				"B": "12 meter",
				"C": "18 meter",
				"D": "24 meter",
				"E": "30 meter",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Seorang wirausahawan siswa membuat produk roti dengan biaya produksi Rp4.000,00 per buah. Jika ia ingin memperoleh laba bersih sebesar 25%, berapakah harga jual per roti tersebut?",
			Options: map[string]string{
				"A": "Rp4.500,00",
				"B": "Rp5.000,00",
				"C": "Rp5.500,00",
				"D": "Rp6.000,00",
				"E": "Rp6.500,00",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Perhatikan data nilai asesmen 5 siswa: 75, 80, 85, 90, 70. Nilai rata-rata (mean) dari kelima siswa tersebut adalah...",
			Options: map[string]string{
				"A": "78",
				"B": "80",
				"C": "82",
				"D": "84",
				"E": "85",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Perhatikan barisan angka pola aritmatika berikut: 3, 7, 11, 15, ..., nilai suku berikutnya adalah...",
			Options: map[string]string{
				"A": "17",
				"B": "18",
				"C": "19",
				"D": "20",
				"E": "21",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Dalam sebuah kotak terdapat 10 komponen baut baik dan 2 komponen baut cacat. Berapakah peluang terambilnya 1 baut cacat pada pengambilan acak pertama?",
			Options: map[string]string{
				"A": "1/12",
				"B": "2/12 (1/6)",
				"C": "2/10",
				"D": "5/6",
				"E": "1/2",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Sebuah printer mencetak dokumen dengan kecepatan 30 halaman per menit. Waktu yang diperlukan untuk mencetak 450 halaman buku modul pembelajaran adalah...",
			Options: map[string]string{
				"A": "10 menit",
				"B": "12 menit",
				"C": "15 menit",
				"D": "20 menit",
				"E": "25 menit",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Sebuah resep kuliner membutuhkan perbandingan tepung terigu dan gula sebesar 3 : 2. Jika tepung terigu yang digunakan sebanyak 600 gram, berapa gram gula pasir yang dibutuhkan?",
			Options: map[string]string{
				"A": "300 gram",
				"B": "400 gram",
				"C": "450 gram",
				"D": "500 gram",
				"E": "550 gram",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Data kapasitas penyimpanan: 1 Gigabyte (GB) setara dengan... Megabyte (MB) dalam standar biner komputasi (1024 basis).",
			Options: map[string]string{
				"A": "100 MB",
				"B": "500 MB",
				"C": "1000 MB",
				"D": "1024 MB",
				"E": "2048 MB",
			},
			Answer:  "D",
			Points:  2,
		},

		// BAGIAN 4: LITERASI DIGITAL, ETIKA SIBER & TEKNOLOGI
		{
			Content: "Kombinasi kata sandi (password) akun yang paling kuat dan tahan terhadap serangan peretasan adalah...",
			Options: map[string]string{
				"A": "12345678",
				"B": "namasaya2026",
				"C": "tanggal_lahir_saya",
				"D": "Kombinasi minimal 8-12 karakter yang memuat huruf besar, huruf kecil, angka, dan simbol unik (contoh: P@ssw0rd#2026)",
				"E": "passwordbaru",
			},
			Answer:  "D",
			Points:  2,
		},
		{
			Content: "Serangan rekayasa sosial di mana pelaku mengirim pesan atau tautan palsu yang meniru instansi resmi guna mencuri username dan kata sandi korban disebut...",
			Options: map[string]string{
				"A": "DDoS Attack",
				"B": "Phishing",
				"C": "Defragmentasi",
				"D": "Compiling",
				"E": "Overclocking",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Etika komunikasi digital (Netiket) yang baik saat mengirim pesan pertanyaan formal kepada guru melalui pesan instan adalah...",
			Options: map[string]string{
				"A": "Langsung bertanya tanpa salam dan tanpa menyebutkan identitas.",
				"B": "Menyampaikan salam, memperkenalkan nama dan kelas, menyampaikan tujuan dengan sopan, serta mengucapkan terima kasih.",
				"C": "Mengirim pesan tengah malam pukul 01.00 dengan huruf kapital semua.",
				"D": "Menggunakan bahasa gaul singkat yang sulit dipahami.",
				"E": "Melakukan spam panggilan telepon berulang-ulang tanpa konfirmasi.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Keuntungan utama pemanfaatan penyimpanan awan (Cloud Storage seperti Google Drive / OneDrive) dalam tugas kelompok siswa adalah...",
			Options: map[string]string{
				"A": "Membuat baterai ponsel tahan seminggu penuh.",
				"B": "Memungkinkan kolaborasi penyuntingan berkas bersama secara real-time dan pencadangan data otomatis yang aman.",
				"C": "Menghilangkan kebutuhan sinyal internet saat mengunggah berkas.",
				"D": "Menghapus otomatis berkas anggota tim lain.",
				"E": "Menggandakan kapasitas memori fisik ponsel.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Kombinasi tombol keyboard (shortcut) universal yang digunakan untuk membatalkan tindakan terakhir (Undo) adalah...",
			Options: map[string]string{
				"A": "Ctrl + C",
				"B": "Ctrl + V",
				"C": "Ctrl + Z",
				"D": "Ctrl + P",
				"E": "Ctrl + X",
			},
			Answer:  "C",
			Points:  2,
		},
		{
			Content: "Format ekstensi berkas dokumen digital yang dirancang agar tata letak (layout) dan tampilannya tetap sama persis di semua perangkat adalah...",
			Options: map[string]string{
				"A": ".txt",
				"B": ".pdf",
				"C": ".mp3",
				"D": ".exe",
				"E": ".zip",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Mengapa pembaruan sistem operasi dan aplikasi secara berkala (Software Update) sangat penting bagi keamanan perangkat?",
			Options: map[string]string{
				"A": "Hanya untuk mengubah tampilan warna tema aplikasi.",
				"B": "Untuk menambal celah keamanan (security patches) dan memperbaiki bug dari serangan siber terbaru.",
				"C": "Untuk menghapus seluruh riwayat foto galeri.",
				"D": "Untuk mempercepat kuota internet habis.",
				"E": "Untuk mengunci akun pengguna secara otomatis.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Sikap yang paling bijak dan taat hukum dalam menggunakan materi gambar atau musik orang lain dari internet untuk tugas sekolah adalah...",
			Options: map[string]string{
				"A": "Mengklaim karya tersebut sebagai buatan sendiri tanpa izin.",
				"B": "Menggunakan konten berlisensi bebas (Creative Commons / Royalty Free) dan menyertakan atribusi sumber aslinya.",
				"C": "Menghapus watermark pencipta asli menggunakan aplikasi edit foto.",
				"D": "Menjual kembali karya orang lain tanpa izin lisensi.",
				"E": "Menyebarluaskan karya tersebut dengan nama samaran.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Tindakan 'Backup Data' secara rutin bertujuan untuk...",
			Options: map[string]string{
				"A": "Mencegah data hilang secara permanen apabila terjadi kerusakan perangkat keras, serangan virus, atau kesalahan manusia.",
				"B": "Memperbesar ukuran dokumen hingga dua kali lipat.",
				"C": "Menghapus berkas cadangan secara otomatis.",
				"D": "Mengubah dokumen teks menjadi berkas video.",
				"E": "Mengurangi resolusi foto yang tersimpan.",
			},
			Answer:  "A",
			Points:  2,
		},
		{
			Content: "Pemanfaatan Kecerdasan Artifisial (Artificial Intelligence / AI) dalam pembelajaran kejuruan sebaiknya diposisikan sebagai...",
			Options: map[string]string{
				"A": "Alat untuk mencontek dan menjiplak tugas tanpa dipelajari kembali.",
				"B": "Alat bantu asisten belajar untuk mencari inspirasi, memahami materi sulit, dan mempercepat eksplorasi pengetahuan secara kritis.",
				"C": "Pengganti mutlak peran akal pikiran dan nalar manusia.",
				"D": "Sarana memalsukan dokumen nilai ujian sekolah.",
				"E": "Media untuk menyebarkan berita bohong (hoaks).",
			},
			Answer:  "B",
			Points:  2,
		},

		// BAGIAN 5: WAWASAN KEBANGSAAN & BUDAYA KERJA SMK (K3 / 5R)
		{
			Content: "Penerapan nilai Sila Pertama Pancasila 'Ketuhanan Yang Maha Esa' di lingkungan SMK diwujudkan dengan sikap...",
			Options: map[string]string{
				"A": "Memaksa orang lain mengikuti kepercayaan yang kita anut.",
				"B": "Menghormati hak teman yang berlainan agama untuk beribadah dan menjaga toleransi antarumat beragama.",
				"C": "Hanya mau berteman dengan teman yang satu keyakinan saja.",
				"D": "Tidak peduli dengan kegiatan keagamaan di sekolah.",
				"E": "Mengganggu jalannya ibadah orang lain di tempat umum.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Konsep budaya industri 5R / 5S yang berarti 'Memisahkan barang yang masih diperlukan dengan barang yang sudah tidak terpakai lalu menyingkirkannya' adalah...",
			Options: map[string]string{
				"A": "Ringkas (Seiri)",
				"B": "Rapi (Seiton)",
				"C": "Resik (Seiso)",
				"D": "Rawat (Seiketsu)",
				"E": "Rajin (Shitsuke)",
			},
			Answer:  "A",
			Points:  2,
		},
		{
			Content: "Penerapan konsep budaya kerja industri 'Resik' (Seiso) di ruang praktik kejuruan diwujudkan dengan...",
			Options: map[string]string{
				"A": "Menata letak peralatan sesuai urutan penggunaannya.",
				"B": "Membersihkan area kerja dan mesin dari debu, kotoran, dan sisa bahan secara rutin setiap selesai praktik.",
				"C": "Membuat jadwal piket tanpa pernah dilaksanakan.",
				"D": "Membuang sampah di bawah meja kerja praktikum.",
				"E": "Menyimpan alat praktik yang kotor ke dalam lemari tertutup.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Alat Pelindung Diri (APD) utama yang wajib digunakan saat berada di area praktik dengan risiko percikan bahan kimia atau serpihan debu/logam adalah...",
			Options: map[string]string{
				"A": "Kacamata Pelindung (Safety Goggles)",
				"B": "Sandal jepit santai",
				"C": "Topi fedora",
				"D": "Kacamata hitam gaya",
				"E": "Jam tangan analog",
			},
			Answer:  "A",
			Points:  2,
		},
		{
			Content: "Sikap jujur saat mengerjakan asesmen ujian tanpa mencontek merupakan cerminan dari karakter...",
			Options: map[string]string{
				"A": "Apatis dan pasif",
				"B": "Integritas diri dan profesionalisme sebagai calon tenaga kerja yang andal",
				"C": "Kelemahan dalam bersaing dengan teman lain",
				"D": "Sikap tidak percaya diri",
				"E": "Kekakuan dalam menyelesaikan masalah",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Semboyan 'Bhinneka Tunggal Ika' pada lambang negara Garuda Pancasila memiliki makna...",
			Options: map[string]string{
				"A": "Bersatu kita teguh bercerai kita runtuh.",
				"B": "Berbeda-beda tetapi tetap satu jua.",
				"C": "Maju terus pantang mundur.",
				"D": "Keadilan bagi seluruh rakyat Indonesia.",
				"E": "Kemerdekaan adalah jembatan emas.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Tindakan yang mencerminkan etos kerja profesional saat menghadapi batas waktu (deadline) tugas yang ketat adalah...",
			Options: map[string]string{
				"A": "Menunda-nunda pekerjaan hingga menit-menit terakhir.",
				"B": "Membuat skala prioritas, mengelola waktu secara disiplin, dan berfokus menuntaskan tugas dengan mutu terbaik.",
				"C": "Menyalahkan rekan tim atas beban pekerjaan yang banyak.",
				"D": "Meminta perpanjangan waktu tanpa alasan yang masuk akal.",
				"E": "Mengabaikan tugas dan beralih bermain media sosial.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Prinsip Pelayanan Prima (Service Excellence) yang paling dasar dalam menyambut tamu atau pelanggan industri adalah menerapkan 3S, yaitu...",
			Options: map[string]string{
				"A": "Sopan, Santai, Selesai",
				"B": "Senyum, Sapa, Salam",
				"C": "Cepat, Tepat, Hebat",
				"D": "Siap, Siaga, Sigap",
				"E": "Sabar, Setia, Santun",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Setelah selesai menggunakan alat praktik di laboratorium atau bengkel kejuruan, kewajiban setiap siswa adalah...",
			Options: map[string]string{
				"A": "Membiarkan alat tetap di atas meja kerja agar dirapikan oleh petugas kebersihan.",
				"B": "Membersihkan alat dan mengembalikannya ke tempat penyimpanan semula secara rapi dan tertib.",
				"C": "Membawa alat pulang ke rumah masing-masing.",
				"D": "Menaruh alat di sembarang tempat yang kosong.",
				"E": "Mematikan sekering listrik utama sekolah.",
			},
			Answer:  "B",
			Points:  2,
		},
		{
			Content: "Ketika tim kerja kejuruan menghadapi kebuntuan masalah teknis, sikap yang paling konstruktif untuk dilakukan adalah...",
			Options: map[string]string{
				"A": "Saling menyalahkan dan membubarkan kelompok kerja.",
				"B": "Melakukan musyawarah mufakat, saling mendengarkan masukan anggota, dan berkolaborasi mencari solusi terbaik.",
				"C": "Menyerahkan seluruh keputusan kepada anggota yang paling pendiam.",
				"D": "Menutup proyek dan melaporkan kegagalan tanpa mencoba alternatif lain.",
				"E": "Mengambil jalan pintas dengan mengabaikan prosedur keselamatan.",
			},
			Answer:  "B",
			Points:  2,
		},
	}

	fmt.Printf("Menyiapkan %d butir soal berkualitas untuk Bank Soal Simulasi...\n", len(questionsList))

	// 5. Simpan Soal ke Tabel Questions
	var createdQuestions []models.Question
	for idx, q := range questionsList {
		optsJSON, _ := json.Marshal(q.Options)

		var existingQ models.Question
		errQ := db.Where("subject_id = ? AND content LIKE ?", subject.ID, "%"+q.Content[:30]+"%").First(&existingQ).Error

		question := models.Question{
			SubjectID:     subject.ID,
			Type:          models.MultipleChoice,
			Content:       fmt.Sprintf("<p>%s</p>", q.Content),
			Options:       datatypes.JSON(optsJSON),
			CorrectAnswer: q.Answer,
			Points:        q.Points,
			TeacherID:     adminUser.ID,
		}

		if errQ == nil {
			question.ID = existingQ.ID
			db.Model(&existingQ).Updates(question)
			createdQuestions = append(createdQuestions, existingQ)
		} else {
			if err := db.Create(&question).Error; err != nil {
				log.Printf("Gagal membuat soal #%d: %v\n", idx+1, err)
			} else {
				createdQuestions = append(createdQuestions, question)
			}
		}
	}

	fmt.Printf("✅ Berhasil menyimpan %d butir soal ke Bank Soal Simulasi!\n", len(createdQuestions))

	// 6. Buat Jadwal Ujian Simulasi untuk SEMUA KELAS
	now := time.Now()
	startTime := now.Add(-2 * time.Hour) // Sudah aktif
	endTime := now.AddDate(1, 0, 0)      // Tersedia sepanjang tahun untuk testing dan simulasi

	examTitle := "Simulasi Asesmen CBT Bersama - Seluruh Kelas"
	var existingExam models.Exam
	errExam := db.Where("title = ?", examTitle).First(&existingExam).Error

	exam := models.Exam{
		Title:        examTitle,
		SubjectID:    subject.ID,
		CategoryID:   &category.ID,
		StartTime:    startTime,
		EndTime:      endTime,
		Duration:     90,
		TotalPoints:  100,
		Status:       "ACTIVE",
		IsStarted:    true,
		IsMakeupOpen: true, // Siswa dari kelas mana pun bisa langsung mengerjakan
		TeacherID:    adminUser.ID,
		Tahun:        "2026/2027",
		Semester:     "Ganjil",
		Proktor:      "Tim Proktor CBT SMKN 1 Beringin",
		Pengawas:     "Pengawas Ruang 1 - 50",
	}

	if errExam == nil {
		exam.ID = existingExam.ID
		db.Model(&existingExam).Updates(exam)
		fmt.Printf("Jadwal ujian simulasi diperbarui (ID: %d)\n", exam.ID)
	} else {
		if err := db.Create(&exam).Error; err != nil {
			log.Fatalf("Gagal membuat jadwal ujian simulasi: %v", err)
		}
		fmt.Printf("Jadwal ujian simulasi baru dibuat (ID: %d)\n", exam.ID)
	}

	// 7. Kaitkan Soal ke Ujian (exam_questions)
	if err := db.Model(&exam).Association("Questions").Replace(createdQuestions); err != nil {
		log.Printf("Gagal mengaitkan soal ke ujian: %v\n", err)
	} else {
		fmt.Printf("✅ Berhasil mengaitkan %d butir soal ke ujian '%s'!\n", len(createdQuestions), exam.Title)
	}

	// 8. Dapatkan SELURUH KELAS yang ada di database (43 Kelas)
	var allClasses []models.Class
	if err := db.Find(&allClasses).Error; err != nil {
		log.Fatalf("Gagal mengambil data kelas: %v", err)
	}
	fmt.Printf("Ditemukan %d rombel kelas di database.\n", len(allClasses))

	// Kaitkan SELURUH KELAS ke Ujian (exam_classes)
	if err := db.Model(&exam).Association("Classes").Replace(allClasses); err != nil {
		log.Printf("Gagal mengaitkan kelas ke ujian: %v\n", err)
	} else {
		fmt.Printf("✅ Berhasil mengaitkan seluruh %d rombel kelas ke ujian simulasi!\n", len(allClasses))
	}

	// 9. Kaitkan Pengawas (Ruang 1 s/d Ruang 43) ke masing-masing kelas untuk Ujian ini di exam_supervisors
	var ruangUsers []models.User
	db.Where("username LIKE 'ruang%' AND role = ?", models.RoleTeacher).Order("id ASC").Find(&ruangUsers)
	fmt.Printf("Ditemukan %d akun guru/pengawas (ruang).\n", len(ruangUsers))

	supervisorAssigned := 0
	for i, cls := range allClasses {
		if i >= len(ruangUsers) {
			break
		}
		ruangUser := ruangUsers[i]
		ruanganLabel := fmt.Sprintf("Ruang %02d", i+1)

		var existingSup models.ExamSupervisor
		errSup := db.Where("exam_id = ? AND class_id = ?", exam.ID, cls.ID).First(&existingSup).Error

		sup := models.ExamSupervisor{
			ExamID:    exam.ID,
			ClassID:   cls.ID,
			TeacherID: ruangUser.ID,
			Ruangan:   ruanganLabel,
			Notes:     fmt.Sprintf("Pengawas Sesi Simulasi - %s", cls.Name),
			Status:    "STARTED", // Langsung STARTED agar siswa bisa mulai seketika
			IsStarted: true,
			IsPaused:  false,
		}

		if errSup == nil {
			db.Model(&existingSup).Updates(sup)
		} else {
			db.Create(&sup)
		}
		supervisorAssigned++
	}

	fmt.Printf("✅ Berhasil menugaskan %d guru pengawas (ruang1 - ruang%d) ke rombel kelas masing-masing!\n", supervisorAssigned, supervisorAssigned)

	fmt.Println("=========================================================")
	fmt.Println("🎉 SUKSES BESAR! SIMULASI CBT UNTUK SEMUA KELAS SIAP DIGUNAKAN:")
	fmt.Printf("- Judul Ujian: %s\n", exam.Title)
	fmt.Printf("- Mata Pelajaran: %s (%s)\n", subject.Name, subject.Code)
	fmt.Printf("- Total Butir Soal: %d Butir Soal Pilihan Ganda (A-E)\n", len(createdQuestions))
	fmt.Printf("- Total Poin: %d Poin (2 poin per soal)\n", exam.TotalPoints)
	fmt.Printf("- Durasi Pengerjaan: %d Menit\n", exam.Duration)
	fmt.Printf("- Target Rombel Kelas: %d Kelas (X, XI, XII Semua Jurusan)\n", len(allClasses))
	fmt.Printf("- Pengawas Ditugaskan: %d Ruang (ruang1 s/d ruang%d, password: pengawas123)\n", supervisorAssigned, supervisorAssigned)
	fmt.Printf("- Status Ujian: ACTIVE (STARTED) & Siap Dikerjakan Sekarang\n")
	fmt.Println("=========================================================")
}
