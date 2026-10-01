import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../utils/app_toast.dart';
import '../../../data/api_client.dart';
import '../../../data/services/update_service.dart';

class HomeController extends GetxController {
  final _dio = ApiClient().dio;
  var isLoading = true.obs;
  
  var exams = <dynamic>[].obs;
  var activeExams = <dynamic>[].obs;
  var historyExams = <dynamic>[].obs;
  
  var studentName = ''.obs;
  var studentNis = ''.obs;
  var className = ''.obs;

  @override
  void onInit() {
    super.onInit();
    UpdateService.checkForUpdate();
    fetchExams();
    loadProfile();
  }

  void loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    studentName.value = prefs.getString('name') ?? 'Siswa';
    studentNis.value = prefs.getString('nis') ?? '-';
    className.value = prefs.getString('class_name') ?? '-';

    try {
      final response = await _dio.get('/api/v1/auth/me');
      if (response.statusCode == 200) {
        final data = response.data;
        await prefs.setString('username', data['user']['username'] ?? '');
        await prefs.setString('name', data['user']['name'] ?? 'Siswa');

        if (data['student'] != null) {
          final nisn = data['student']['nisn']?.toString() ?? '';
          final nis = data['student']['nis']?.toString() ?? '';
          String combinedNis = nis.isNotEmpty ? "$nisn/$nis" : "$nisn/-";
          await prefs.setString('nis', combinedNis);
          
          final cName = data['student']['class']?['name']?.toString() ?? '';
          await prefs.setString('class_name', cName);
        }

        studentName.value = prefs.getString('name') ?? 'Siswa';
        studentNis.value = prefs.getString('nis') ?? '-';
        className.value = prefs.getString('class_name') ?? '-';
      }
    } catch (e) {
      debugPrint("Gagal sync profile: $e");
    }
  }

  Future<void> fetchExams() async {
    isLoading(true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) {
        Get.offAllNamed('/login');
        return;
      }

      // Detect abnormal termination (Ctrl+Alt+Del, Sign out, Task Manager kill, restart)
      final ongoingExamId = prefs.getInt('ongoing_exam_id');
      if (ongoingExamId != null) {
        await prefs.remove('ongoing_exam_id');
        try {
          await _dio.post('/api/v1/student/exams/$ongoingExamId/lock', data: {
            'reason': 'Aplikasi ditutup atau keluar paksa saat ujian berlangsung',
          });
        } catch (_) {}
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.error(
            title: "Ujian Terkunci!",
            message: "Terdeteksi keluar dari aplikasi saat ujian sedang berlangsung. Sesi ujian Anda telah dikunci. Silakan hubungi proktor/pengawas/guru untuk membuka kembali.",
          );
        });
      }

      final response = await _dio.get('/api/v1/student/exams');

      if (response.statusCode == 200) {
        List data = response.data ?? [];
        exams.value = data;
        
        activeExams.clear();
        historyExams.clear();

        final now = DateTime.now();

        for (var exam in data) {
          if (exam['status'] == 'DRAFT') continue;

          bool isActive = false;
          final startTime = DateTime.parse(exam['start_time']).toLocal();
          final endTime = DateTime.parse(exam['end_time']).toLocal();
          final isMakeupOpen = exam['is_makeup_open'] == true;

          if (exam['status'] == 'ACTIVE' || exam['status'] == 'SCHEDULED') {
             if (exam['session_status'] == 'ONGOING' || exam['session_status'] == 'LOCKED' || exam['session_status'] == 'PAUSED') {
                isActive = true;
             } else if (exam['session_status'] == 'BELUM MULAI' || exam['session_status'] == 'MENUNGGU PENGAWAS') {
                if (isMakeupOpen) {
                   isActive = true;
                } else if (now.isAfter(startTime) && now.isBefore(endTime)) {
                   isActive = true;
                } else if (now.isBefore(startTime)) {
                   isActive = true;
                }
             }
          }
          
          if (isActive) {
            activeExams.add(exam);
          } else {
            historyExams.add(exam);
          }
        }
      }
    } catch (e) {
      if (e is DioException && e.response?.statusCode == 426) {
        // Upgrade required, UpdateService has already triggered the mandatory update UI
        return;
      } else if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        logout();
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.error(
            title: "Sesi Berakhir",
            message: "Sesi Anda telah berakhir atau tidak valid. Silakan login kembali.",
          );
        });
      } else {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.error(
            title: "Gagal Memuat Jadwal",
            message: "Tidak dapat menyinkronkan data ujian. Periksa koneksi internet Anda.",
          );
        });
      }
    } finally {
      isLoading(false);
    }
  }

  void startExam(dynamic exam) async {
    if (UpdateService.isUpdateRequired.value) {
      UpdateService.checkForUpdate(isManualCheck: true);
      return;
    }

    if (exam['session_status'] == 'MENUNGGU PENGAWAS' || exam['can_start'] == false) {
      AppToast.info(
        title: "Menunggu Pengawas",
        message: "Ujian belum dimulai oleh guru pengawas ruang. Harap tunggu pengawas memulai sesi ujian.",
      );
      return;
    }
    if (exam['session_status'] == 'PAUSED') {
      AppToast.warning(
        title: "Ujian Dihentikan Sementara",
        message: "Ujian saat ini sedang diberhentikan sementara oleh pengawas ruang (misal suasana kelas berisik).",
      );
      return;
    }

    if (!kIsWeb && Platform.isAndroid) {
      Get.dialog(
        AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 28),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Peringatan Ujian",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                "Sebelum memulai ujian, pastikan:",
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
              ),
              SizedBox(height: 8),
              Text(
                "1. Tutup SEMUA jendela mengambang (floating window / tab AI seperti ChatGPT) dengan menekan tanda [X] pada jendela tersebut.",
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              SizedBox(height: 6),
              Text(
                "2. Jangan membuka aplikasi lain, notifikasi, atau menu pintasan selama ujian.",
                style: TextStyle(fontSize: 13, height: 1.4),
              ),
              SizedBox(height: 10),
              Text(
                "⚠️ Jika jendela mengambang disentuh atau fokus keluar saat ujian, sistem akan OTOMATIS MENGUNCI ujian dan Anda langsung dikeluarkan!",
                style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Get.back(),
              child: const Text("Batal", style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF10B981),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                Get.back();
                Get.toNamed('/exam', arguments: {
                  'exam_id': exam['ID'],
                  'title': exam['title']?.toString() ?? 'Ujian',
                  'duration': exam['duration'] ?? 0,
                  'exam_data': exam,
                });
              },
              child: const Text("Saya Mengerti, Mulai", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        barrierDismissible: false,
      );
      return;
    }

    Get.toNamed('/exam', arguments: {
      'exam_id': exam['ID'],
      'title': exam['title']?.toString() ?? 'Ujian',
      'duration': exam['duration'] ?? 0,
      'exam_data': exam,
    });
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    Get.offAllNamed('/login');
  }
}
