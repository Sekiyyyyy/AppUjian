package main

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"gorm.io/datatypes"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/AppUjian/backend/config"
	"github.com/AppUjian/backend/internal/models"
)

type QuestionItem struct {
	Content string
	Options map[string]string
	Answer  string
	Points  int
}

func main() {
	// Connect to database
	dsn := "host=/var/run/postgresql user=postgres dbname=appujian sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		// Fallback to TCP if socket fails
		cfg := config.LoadConfig()
		db, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
		if err != nil {
			log.Fatalf("Gagal terhubung ke database: %v", err)
		}
	}

	fmt.Println("Berhasil terhubung ke database PostgreSQL!")

	// 1. Dapatkan atau Buat Mata Pelajaran Simulasi
	var subject models.Subject
	err = db.Where("code = ?", "SIM-PPLG-XII").First(&subject).Error
	if err != nil {
		subject = models.Subject{
			Name:     "Konsentrasi Keahlian PPLG (Simulasi CBT)",
			Code:     "SIM-PPLG-XII",
			Type:     "JURUSAN",
			Class:    "XII PPLG",
			Tahun:    "2026/2027",
			Semester: "Ganjil",
		}
		if err := db.Create(&subject).Error; err != nil {
			log.Fatalf("Gagal membuat subject: %v", err)
		}
		fmt.Printf("Mata pelajaran dibuat: %s (ID: %d)\n", subject.Name, subject.ID)
	} else {
		fmt.Printf("Mata pelajaran ditemukan: %s (ID: %d)\n", subject.Name, subject.ID)
	}

	// 2. Dapatkan Kelas XII PPLG 3
	var classXII models.Class
	err = db.Where("level = ? AND department ILIKE ? AND number = ?", "XII", "%PPLG%", "3").First(&classXII).Error
	if err != nil {
		// Coba variasi query
		err = db.Where("level = ? AND department ILIKE ?", "XII", "%PPLG 3%").First(&classXII).Error
		if err != nil {
			// Cari sembarang kelas XII PPLG
			err = db.Where("level = ? AND department ILIKE ?", "XII", "%PPLG%").First(&classXII).Error
		}
	}
	if err != nil {
		classXII = models.Class{
			Level:      "XII",
			Department: "PPLG",
			Number:     "3",
		}
		db.Create(&classXII)
		fmt.Printf("Kelas XII PPLG 3 baru dibuat (ID: %d)\n", classXII.ID)
	} else {
		fmt.Printf("Target Kelas XII PPLG 3 ditemukan: %s %s %s (ID: %d)\n", classXII.Level, classXII.Department, classXII.Number, classXII.ID)
	}

	// 3. Dapatkan Guru Pengampu atau Admin
	var teacher models.User
	err = db.Where("role IN ?", []string{"TEACHER", "ADMIN"}).First(&teacher).Error
	if err != nil {
		log.Fatalf("User pengampu/guru tidak ditemukan: %v", err)
	}

	// 4. Kumpulan 35 Soal Kejuruan XII PPLG (OOP, Fullstack Web, Mobile Dart/Flutter, Database SQL, Git & Agile)
	questionsList := []QuestionItem{
		{
			Content: "Dalam Pemrograman Berorientasi Objek (OOP), konsep menyembunyikan detail implementasi internal suatu objek dan hanya menyediakan antarmuka publik yang aman disebut...",
			Options: map[string]string{
				"A": "Inheritance (Pewarisan)",
				"B": "Encapsulation (Enkapsulasi)",
				"C": "Polymorphism (Polimorfisme)",
				"D": "Abstraction (Abstraksi)",
				"E": "Instantiation (Instansiasi)",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Manakah prinsip SOLID yang menyatakan bahwa sebuah class seharusnya hanya memiliki satu alasan untuk berubah (single reason to change)?",
			Options: map[string]string{
				"A": "Open/Closed Principle",
				"B": "Liskov Substitution Principle",
				"C": "Interface Segregation Principle",
				"D": "Single Responsibility Principle",
				"E": "Dependency Inversion Principle",
			},
			Answer: "D",
			Points: 3,
		},
		{
			Content: "Pada arsitektur RESTful API, metode HTTP manakah yang paling tepat digunakan untuk memperbarui seluruh data (full replace) pada suatu entitas?",
			Options: map[string]string{
				"A": "GET",
				"B": "POST",
				"C": "PUT",
				"D": "PATCH",
				"E": "DELETE",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Kode status HTTP 401 Unauthorized dan 403 Forbidden memiliki perbedaan mendasar, yaitu...",
			Options: map[string]string{
				"A": "401 berarti server error, sedangkan 403 berarti route URL tidak ditemukan.",
				"B": "401 berarti klien belum terautentikasi (belum login/token tidak valid), sedangkan 403 berarti klien telah login namun tidak memiliki hak akses (izin).",
				"C": "401 untuk permintaan POST, sedangkan 403 khusus permintaan GET.",
				"D": "401 berarti database overload, sedangkan 403 berarti koneksi timeout.",
				"E": "Tidak ada perbedaan, keduanya memiliki arti identik.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam perancangan basis data relasional, sebuah tabel dikatakan telah memenuhi Bentuk Normal Ketiga (3NF) jika memenuhi 2NF dan...",
			Options: map[string]string{
				"A": "Memiliki foreign key yang mengarah ke tabel master.",
				"B": "Tidak memiliki ketergantungan transitif (non-key attribute bergantung pada non-key attribute lain).",
				"C": "Semua kolom bertipe data numerik.",
				"D": "Menggunakan UUID sebagai primary key.",
				"E": "Memiliki indeks composite di semua kolom pencarian.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Perhatikan query SQL berikut: \n`SELECT c.name, COUNT(s.id) FROM classes c LEFT JOIN students s ON c.id = s.class_id GROUP BY c.name;` \nFungsi dari penggunaan `LEFT JOIN` pada query tersebut adalah...",
			Options: map[string]string{
				"A": "Hanya menampilkan kelas yang sudah memiliki minimal 1 siswa.",
				"B": "Menampilkan seluruh kelas termasuk kelas yang belum memiliki siswa (jumlah siswa 0).",
				"C": "Menghapus data kelas yang tidak memiliki siswa dari hasil query.",
				"D": "Menggabungkan dua tabel tanpa perlu kondisi pencocokan primary key.",
				"E": "Mengurutkan nama kelas dari kiri ke kanan.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam framework Flutter, perbedaan utama antara `StatelessWidget` dan `StatefulWidget` adalah...",
			Options: map[string]string{
				"A": "StatelessWidget dapat me-render animasi, sedangkan StatefulWidget tidak bisa.",
				"B": "StatelessWidget bersifat immutable (tidak memiliki state yang berubah selama runtime), sedangkan StatefulWidget memiliki State object yang dinamis dapat diperbarui melalui `setState()`.",
				"C": "StatelessWidget hanya berjalan di Android, sedangkan StatefulWidget hanya di iOS.",
				"D": "StatelessWidget memerlukan koneksi internet, sedangkan StatefulWidget berjalan offline.",
				"E": "StatefulWidget tidak memerlukan BuildContext.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Perintah Git yang digunakan untuk menggabungkan riwayat commit dari cabang (branch) fitur ke cabang utama (main) tanpa membuat merge commit baru melainkan memindahkan base commit disebut...",
			Options: map[string]string{
				"A": "git checkout -b",
				"B": "git merge --no-ff",
				"C": "git rebase",
				"D": "git reset --hard",
				"E": "git stash apply",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam metodologi Agile Scrum, pertemuan singkat harian (Daily Scrum) berdurasi sekitar 15 menit bertujuan untuk...",
			Options: map[string]string{
				"A": "Menentukan gaji dan bonus anggota tim pengembang.",
				"B": "Sinkronisasi aktivitas tim: apa yang dikerjakan kemarin, apa yang akan dikerjakan hari ini, dan kendala (blocker) yang dihadapi.",
				"C": "Menandatangani kontrak proyek dengan klien.",
				"D": "Melakukan uji coba beban server (load testing).",
				"E": "Menulis kode program secara berpasangan dari awal hingga selesai.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Diagram UML manakah yang paling tepat digunakan untuk memodelkan interaksi pertukaran pesan (messages) antar objek atau komponen secara berurutan berdasarkan waktu (time sequence)?",
			Options: map[string]string{
				"A": "Class Diagram",
				"B": "Use Case Diagram",
				"C": "Sequence Diagram",
				"D": "Activity Diagram",
				"E": "Deployment Diagram",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam arsitektur otentikasi JWT (JSON Web Token), token umumnya terdiri dari 3 bagian yang dipisahkan oleh tanda titik (.), yaitu...",
			Options: map[string]string{
				"A": "Username, Password, Salt",
				"B": "Header, Payload, Signature",
				"C": "Client, Server, Database",
				"D": "Origin, Host, Referer",
				"E": "Algorithm, Data, HashKey",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Perhatikan fungsi JavaScript modern berikut:\n`const hasil = angka.filter(n => n % 2 === 0).map(n => n * 2);`\nJika array `angka = [1, 2, 3, 4, 5]`, maka nilai variabel `hasil` adalah...",
			Options: map[string]string{
				"A": "[2, 4, 6, 8, 10]",
				"B": "[4, 8]",
				"C": "[2, 4]",
				"D": "[1, 3, 5]",
				"E": "[2, 8, 10]",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam pengembangan gim 2D, teknik deteksi tabrakan yang memeriksa apakah dua kotak batas objek saling bertumpukan berdasarkan koordinat (x, y, width, height) disebut...",
			Options: map[string]string{
				"A": "Raycasting Collision",
				"B": "Axis-Aligned Bounding Box (AABB)",
				"C": "Pixel-Perfect Masking",
				"D": "Convex Hull Detection",
				"E": "Barycentric Coordinate",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam siklus utama game engine (Game Loop), urutan proses mendasar yang dieksekusi terus-menerus setiap frame adalah...",
			Options: map[string]string{
				"A": "Compile -> Build -> Deploy",
				"B": "Process Input -> Update Game State & Physics -> Render / Draw",
				"C": "Save -> Load -> Exit",
				"D": "Login -> Connect -> Disconnect",
				"E": "Animate -> Audio -> Network",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Teknik pengujian perangkat lunak di mana penguji memeriksa struktur internal kode program, logika percabangan (branch), dan alur eksekusi tanpa melihat antarmuka pengguna disebut...",
			Options: map[string]string{
				"A": "Black Box Testing",
				"B": "White Box Testing",
				"C": "User Acceptance Testing (UAT)",
				"D": "Usability Testing",
				"E": "Smoke Testing",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Untuk mencegah serangan SQL Injection pada aplikasi web saat melakukan query ke database, praktik terbaik yang wajib diterapkan adalah...",
			Options: map[string]string{
				"A": "Menggabungkan input pengguna langsung menggunakan konkatenasi string string (+) pada query.",
				"B": "Menggunakan Prepared Statements atau Parameterized Queries (ORM).",
				"C": "Menonaktifkan firewall server basis data.",
				"D": "Menyimpan seluruh password dalam format Plain Text.",
				"E": "Mematikan mode SSL/TLS pada port PostgreSQL.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Di pemrograman Dart/Flutter, keyword manakah yang digunakan untuk menandai bahwa suatu variabel non-nullable akan diinisialisasi nilainya nanti sebelum digunakan?",
			Options: map[string]string{
				"A": "const",
				"B": "final",
				"C": "late",
				"D": "static",
				"E": "dynamic",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Manakah perintah Git yang tepat untuk membatalkan perubahan file di working directory yang belum di-stage sehingga kembali ke kondisi commit terakhir?",
			Options: map[string]string{
				"A": "git restore <nama_file>",
				"B": "git commit --amend",
				"C": "git branch -d <nama_file>",
				"D": "git push origin master",
				"E": "git tag -a v1.0",
			},
			Answer: "A",
			Points: 3,
		},
		{
			Content: "Dalam arsitektur MVC (Model-View-Controller), peran utama komponen 'Model' adalah...",
			Options: map[string]string{
				"A": "Menampilkan tampilan visual dan tombol interaktif kepada pengguna.",
				"B": "Menangani rute URL dan menerima permintaan HTTP dari peramban.",
				"C": "Mengelola data, logika bisnis, validasi, dan komunikasi langsung dengan basis data.",
				"D": "Mengatur konfigurasi DNS dan web server Apache/Nginx.",
				"E": "Menyimpan file CSS dan font tipografi.",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Algoritma pengurutan (sorting algorithm) manakah yang menggunakan pendekatan 'Divide and Conquer' dengan memilih sebuah elemen pivot untuk mempartisi array menjadi dua sub-array?",
			Options: map[string]string{
				"A": "Bubble Sort",
				"B": "Insertion Sort",
				"C": "Quick Sort",
				"D": "Selection Sort",
				"E": "Linear Sort",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam CSS Grid dan Flexbox, properti manakah yang digunakan pada flex container untuk meratakan item-item fleksibel di sepanjang sumbu utama (main axis)?",
			Options: map[string]string{
				"A": "align-items",
				"B": "justify-content",
				"C": "align-content",
				"D": "flex-direction",
				"E": "flex-wrap",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Ketika membangun REST API menggunakan bahasa Go (Golang), tipe data bawaan yang digunakan untuk mengelola aliran data konkuren secara aman antar Goroutine adalah...",
			Options: map[string]string{
				"A": "Pointer",
				"B": "Slice",
				"C": "Channel (chan)",
				"D": "Struct",
				"E": "Interface",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam database PostgreSQL dan MySQL, indeks bertipe B-Tree sangat efisien digunakan untuk...",
			Options: map[string]string{
				"A": "Hanya pencarian teks tidak terstruktur (full text NLP).",
				"B": "Pencarian kesetaraan (=), perbandingan rentang (<, <=, >, >=, BETWEEN), dan pengurutan (ORDER BY).",
				"C": "Menyimpan file audio dan video biner berukuran besar (BLOB).",
				"D": "Mengenkripsi password secara otomatis dengan salt acak.",
				"E": "Menjalankan migrasi tabel otomatis saat server restart.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Apa kepanjangan dan tujuan utama dari prinsip DRY dalam rekayasa perangkat lunak?",
			Options: map[string]string{
				"A": "Do Right Yourself - Memastikan kode selalu di-compile sendiri.",
				"B": "Don't Repeat Yourself - Menghindari duplikasi kode atau logika dengan abstraksi dan fungsi reusable.",
				"C": "Data Recovery Yield - Mengembalikan data yang hilang di database.",
				"D": "Deploy Rapidly Yearly - Menjadwalkan rilis aplikasi setahun sekali.",
				"E": "Direct Route Yield - Mengurangi latensi jaringan internet.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam pengembangan antarmuka pengguna (UI/UX) berbasis Web, konsep Single Page Application (SPA) berarti...",
			Options: map[string]string{
				"A": "Aplikasi yang seluruh kodenya hanya boleh ditulis dalam satu file HTML saja.",
				"B": "Aplikasi web yang memuat satu halaman awal dan secara dinamis memperbarui konten tanpa me-reload seluruh halaman browser.",
				"C": "Website statis tanpa kemampuan interaksi JavaScript.",
				"D": "Aplikasi yang hanya bisa diakses menggunakan layar smartphone.",
				"E": "Website yang tidak memerlukan web server untuk di-hosting.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Manakah di bawah ini yang BUKAN merupakan fitur bawaan dari Git version control?",
			Options: map[string]string{
				"A": "Branching dan Merging riwayat kode.",
				"B": "Distributed repository (setiap kontributor memiliki klon riwayat penuh).",
				"C": "Otomatis melakukan perbaikan bug tanpa campur tangan programmer.",
				"D": "Staging area untuk memilih perubahan yang akan di-commit.",
				"E": "Cryptographic integrity menggunakan SHA-1/SHA-256 hash.",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam pemrograman asinkron JavaScript, jika kita menggunakan `Promise`, blok manakah yang akan dieksekusi ketika promise tersebut ditolak (rejected) atau terjadi error?",
			Options: map[string]string{
				"A": ".then()",
				"B": ".catch()",
				"C": ".finally()",
				"D": ".resolve()",
				"E": ".async()",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam keamanan aplikasi web, Cross-Site Scripting (XSS) adalah kerentanan keamanan di mana penyerang berhasil...",
			Options: map[string]string{
				"A": "Mengirimkan banjir paket data TCP SYN untuk mematikan server (DDoS).",
				"B": "Menyisipkan skrip berbahaya (misalnya JavaScript) ke dalam halaman web yang dilihat oleh pengguna lain.",
				"C": "Membongkar password database PostgreSQL secara brute force.",
				"D": "Menghapus file log pada sistem operasi Linux server.",
				"E": "Mencuri sinyal Wi-Fi dari access point sekolah.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Dalam manajemen memori bahasa pemrograman tingkat rendah dan tinggi, perbedaan antara Stack dan Heap adalah...",
			Options: map[string]string{
				"A": "Stack digunakan untuk alokasi memori dinamis besar, sedangkan Heap untuk variabel lokal.",
				"B": "Stack mengalokasikan memori secara teratur (LIFO) untuk pemanggilan fungsi dan variabel lokal berukuran tetap, sedangkan Heap untuk alokasi dinamis berukuran fleksibel.",
				"C": "Stack disimpan di harddisk, sedangkan Heap disimpan di GPU.",
				"D": "Stack tidak memiliki batas ukuran memori.",
				"E": "Heap otomatis dibersihkan dalam waktu 1 milidetik tanpa Garbage Collector.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Pada engine gim Unity atau Godot, konsep 'Delta Time' (Time.deltaTime) dikalikan dengan kecepatan perpindahan objek bertujuan untuk...",
			Options: map[string]string{
				"A": "Membuat pergerakan objek konsisten dan independen terhadap fluktuasi frame rate (FPS) perangkat pengguna.",
				"B": "Menghilangkan bayangan dan efek partikel objek 3D.",
				"C": "Mengurangi pemakaian RAM tekstur 2D.",
				"D": "Mempercepat waktu kompilasi script C#.",
				"E": "Mengatur volume audio background musik secara otomatis.",
			},
			Answer: "A",
			Points: 3,
		},
		{
			Content: "Dalam metodologi Continuous Integration / Continuous Deployment (CI/CD), apa fungsi dari file konfigurasi workflow seperti `.github/workflows/build_apps.yml`?",
			Options: map[string]string{
				"A": "Mengatur skema warna tema gelap pada aplikasi pengguna.",
				"B": "Mengotomatiskan langkah pengujian (testing), build binary (.apk, .exe, .ipa), dan rilis artifact setiap kali ada kode yang di-push ke repository.",
				"C": "Menggantikan peran database relasional PostgreSQL.",
				"D": "Menyimpan password akun siswa secara terbuka.",
				"E": "Mematikan server produksi jika ada kompilasi yang gagal.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Jika ingin mengamankan komunikasi data antara aplikasi klien (mobile/web) dan server dari penyadapan (Man-in-the-Middle Attack), protokol yang wajib digunakan adalah...",
			Options: map[string]string{
				"A": "HTTP biasa di port 80",
				"B": "FTP tanpa otentikasi di port 21",
				"C": "HTTPS dengan sertifikat enkripsi TLS/SSL di port 443",
				"D": "Telnet di port 23",
				"E": "SNMP v1 tanpa password",
			},
			Answer: "C",
			Points: 3,
		},
		{
			Content: "Dalam Dart dan Flutter, method lifecycle manakah pada State object yang hanya dipanggil tepat SATU kali ketika widget pertama kali dimasukkan ke dalam widget tree?",
			Options: map[string]string{
				"A": "build()",
				"B": "initState()",
				"C": "dispose()",
				"D": "didUpdateWidget()",
				"E": "setState()",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Perhatikan query SQL: `UPDATE students SET is_active = true WHERE class_id = 40;`. Apa akibat yang terjadi jika klausa `WHERE class_id = 40` tidak sengaja dihapus?",
			Options: map[string]string{
				"A": "Query akan gagal dieksekusi karena ada syntax error.",
				"B": "Seluruh baris data siswa di dalam tabel students tanpa terkecuali akan diubah nilai `is_active`-nya menjadi true.",
				"C": "Hanya siswa nomor 1 yang berubah.",
				"D": "Tabel students akan terhapus secara permanen dari database.",
				"E": "Tidak ada perubahan data yang tersimpan.",
			},
			Answer: "B",
			Points: 3,
		},
		{
			Content: "Fitur keamanan Kiosk Mode pada aplikasi ujian CBT SMKN 1 Beringin mencegah kecurangan siswa saat ujian berlangsung dengan mekanisme...",
			Options: map[string]string{
				"A": "Mengizinkan siswa membuka browser lain untuk mencari kunci jawaban.",
				"B": "Mengunci aplikasi ke layar penuh, memblokir tombol sistem (Alt+Tab, Windows Key, Split Screen, Screenshot), dan mengunci sesi jika terdeteksi keluar dari aplikasi.",
				"C": "Mematikan koneksi Wi-Fi secara permanen sehingga ujian tidak bisa disubmit.",
				"D": "Menghapus akun siswa jika nilai ujian di bawah KKM.",
				"E": "Mengirimkan seluruh jawaban siswa ke media sosial.",
			},
			Answer: "B",
			Points: 3,
		},
	}

	fmt.Printf("Menyiapkan %d soal berkualitas tinggi untuk kejuruan XII PPLG...\n", len(questionsList))

	// Simpan Soal ke Tabel Questions
	var createdQuestions []models.Question
	for idx, q := range questionsList {
		optsJSON, _ := json.Marshal(q.Options)

		question := models.Question{
			SubjectID:     subject.ID,
			Type:          models.MultipleChoice,
			Content:       fmt.Sprintf("<p>%s</p>", q.Content),
			Options:       datatypes.JSON(optsJSON),
			CorrectAnswer: q.Answer,
			Points:        q.Points,
			TeacherID:     teacher.ID,
		}

		if err := db.Create(&question).Error; err != nil {
			log.Printf("Gagal membuat soal #%d: %v", idx+1, err)
		} else {
			createdQuestions = append(createdQuestions, question)
		}
	}

	fmt.Printf("Berhasil menyimpan %d butir soal ke Bank Soal!\n", len(createdQuestions))

	// 5. Buat Jadwal Ujian Simulasi untuk Hari Kamis
	// Hitung tanggal Kamis mendatang
	now := time.Now()
	daysUntilThursday := (int(time.Thursday) - int(now.Weekday()) + 7) % 7
	if daysUntilThursday == 0 {
		daysUntilThursday = 7 // Kamis minggu depan jika hari ini Kamis
	}
	thursdayDate := now.AddDate(0, 0, daysUntilThursday)
	startTime := time.Date(thursdayDate.Year(), thursdayDate.Month(), thursdayDate.Day(), 8, 0, 0, 0, time.Local)
	endTime := startTime.Add(4 * time.Hour) // Sesi ujian aktif dari jam 08:00 sampai 12:00

	examTitle := "Simulasi Asesmen Kejuruan CBT - XII PPLG 3"
	var existingExam models.Exam
	err = db.Where("title = ?", examTitle).First(&existingExam).Error

	exam := models.Exam{
		Title:        examTitle,
		SubjectID:    subject.ID,
		StartTime:    startTime,
		EndTime:      endTime,
		Duration:     90, // Durasi 90 Menit
		TotalPoints:  105,
		Status:       "SCHEDULED",
		IsMakeupOpen: true, // Izinkan simulasi dijalankan fleksibel
		TeacherID:    teacher.ID,
		Tahun:        "2026/2027",
		Semester:     "Ganjil",
		Proktor:      "Proktor Laboratorium PPLG",
		Pengawas:     "Tim Penguji Kejuruan PPLG",
	}

	if err == nil {
		exam.ID = existingExam.ID
		db.Model(&existingExam).Updates(exam)
		fmt.Printf("Jadwal ujian simulasi diperbarui (ID: %d)\n", exam.ID)
	} else {
		if err := db.Create(&exam).Error; err != nil {
			log.Fatalf("Gagal membuat jadwal ujian simulasi: %v", err)
		}
		fmt.Printf("Jadwal ujian simulasi berhasil dibuat (ID: %d)\n", exam.ID)
	}

	// 6. Hubungkan Soal ke Ujian (exam_questions)
	if err := db.Model(&exam).Association("Questions").Replace(createdQuestions); err != nil {
		log.Printf("Gagal mengaitkan soal ke ujian: %v", err)
	} else {
		fmt.Printf("Berhasil mengaitkan %d soal ke jadwal ujian '%s'!\n", len(createdQuestions), exam.Title)
	}

	// 7. Hubungkan Kelas XII PPLG 3 ke Ujian (exam_classes)
	if err := db.Model(&exam).Association("Classes").Replace([]models.Class{classXII}); err != nil {
		log.Printf("Gagal mengaitkan kelas XII PPLG 3 ke ujian: %v", err)
	} else {
		fmt.Printf("Berhasil mengaitkan kelas %s %s %s (ID: %d) ke ujian simulasi!\n", classXII.Level, classXII.Department, classXII.Number, classXII.ID)
	}

	fmt.Println("=========================================================")
	fmt.Println("SIMULASI UJIAN XII PPLG 3 BERHASIL DIKONFIGURASI:")
	fmt.Printf("- Judul: %s\n", exam.Title)
	fmt.Printf("- Mata Pelajaran: %s (%s)\n", subject.Name, subject.Code)
	fmt.Printf("- Target Kelas: %s %s %s\n", classXII.Level, classXII.Department, classXII.Number)
	fmt.Printf("- Jadwal: Kamis, %s (08:00 - 12:00 WIB)\n", startTime.Format("02 January 2006"))
	fmt.Printf("- Durasi Pengerjaan: %d Menit\n", exam.Duration)
	fmt.Printf("- Jumlah Soal: %d Butir Pilihan Ganda (A-E)\n", len(createdQuestions))
	fmt.Printf("- Fitur Soal Acak: Aktif secara deterministik per siswa\n")
	fmt.Println("=========================================================")
}
