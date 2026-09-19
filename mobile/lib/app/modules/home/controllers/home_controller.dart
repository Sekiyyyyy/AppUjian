import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../utils/app_toast.dart';
import '../../../data/api_client.dart';

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
    fetchExams();
    loadProfile();
  }

  void loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    studentName.value = prefs.getString('name') ?? 'Siswa';
    studentNis.value = prefs.getString('nis') ?? '-';
    className.value = prefs.getString('class_name') ?? '-';
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
             if (exam['session_status'] == 'ONGOING') {
                isActive = true;
             } else if (exam['session_status'] == 'BELUM MULAI') {
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        AppToast.error(
          title: "Gagal Memuat Jadwal",
          message: "Tidak dapat menyinkronkan data ujian. Periksa koneksi internet Anda.",
        );
      });
    } finally {
      isLoading(false);
    }
  }

  void startExam(dynamic exam) async {
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
