import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ExamController extends GetxController {
  final _dio = Dio();
  
  // Passed arguments
  late int examId;
  late String examTitle;
  late int duration; // in minutes
  Map<String, dynamic>? examData;
  
  // State
  final isLoading = true.obs;
  final errorMessage = ''.obs;
  final questions = <dynamic>[].obs;
  
  // Navigation
  final currentIndex = 0.obs;
  
  // Answers tracking: questionId -> selected answer (e.g., 'A', 'B')
  final answers = <int, String>{}.obs;
  
  // Flagged questions (ragu-ragu): questionId -> true/false
  final flagged = <int, bool>{}.obs;
  
  // Timer
  Timer? _timer;
  final timeRemaining = 0.obs; // in seconds
  
  @override
  void onInit() {
    super.onInit();
    final args = Get.arguments;
    if (args != null) {
      examId = args['exam_id'];
      examTitle = args['title'];
      duration = args['duration'];
      examData = args['exam_data'];
      _startExamProcess();
    } else {
      errorMessage.value = "Data ujian tidak valid.";
      isLoading.value = false;
    }
  }

  @override
  void onClose() {
    _timer?.cancel();
    super.onClose();
  }

  Future<void> _startExamProcess() async {
    isLoading.value = true;
    errorMessage.value = '';
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token == null) {
        Get.offAllNamed('/login');
        return;
      }

      String baseUrl = GetPlatform.isAndroid ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080';
      _dio.options.headers['Authorization'] = 'Bearer $token';

      // 1. Start Exam Session
      final startRes = await _dio.post('$baseUrl/api/v1/student/exams/$examId/start');
      if (startRes.statusCode == 201 || startRes.statusCode == 200) {
        final session = startRes.data;
        
        // Calculate remaining time
        final startTime = DateTime.parse(session['start_time']).toLocal();
        final endTime = startTime.add(Duration(minutes: duration));
        final now = DateTime.now();
        
        if (now.isAfter(endTime)) {
          errorMessage.value = "Waktu ujian telah habis.";
          isLoading.value = false;
          return;
        }
        
        timeRemaining.value = endTime.difference(now).inSeconds;
        _startTimer();
        
        // 2. Fetch Questions
        await _fetchQuestions(baseUrl);
      }
    } on DioException catch (e) {
      errorMessage.value = e.response?.data['error'] ?? "Gagal memulai ujian.";
    } catch (e) {
      errorMessage.value = "Terjadi kesalahan tidak terduga.";
    } finally {
      isLoading.value = false;
    }
  }
  
  Future<void> _fetchQuestions(String baseUrl) async {
    final res = await _dio.get('$baseUrl/api/v1/student/exams/$examId/questions');
    if (res.statusCode == 200) {
      questions.assignAll(res.data);
      // Initialize flagged state to false
      for (var q in questions) {
        flagged[q['id']] = false;
      }
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        timer.cancel();
        _forceSubmitExam();
      }
    });
  }

  String get formattedTime {
    int h = timeRemaining.value ~/ 3600;
    int m = (timeRemaining.value % 3600) ~/ 60;
    int s = timeRemaining.value % 60;
    
    if (h > 0) {
      return "${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}";
    }
    return "${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}";
  }

  void nextQuestion() {
    if (currentIndex.value < questions.length - 1) {
      currentIndex.value++;
    }
  }

  void previousQuestion() {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    }
  }

  void jumpToQuestion(int index) {
    currentIndex.value = index;
  }

  void toggleFlag() {
    if (questions.isEmpty) return;
    final qId = questions[currentIndex.value]['id'];
    flagged[qId] = !(flagged[qId] ?? false);
  }

  Future<void> selectAnswer(String answer) async {
    if (questions.isEmpty) return;
    final qId = questions[currentIndex.value]['id'];
    
    // Update local UI immediately
    answers[qId] = answer;
    
    // Sync to server in background
    try {
      String baseUrl = GetPlatform.isAndroid ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080';
      await _dio.post('$baseUrl/api/v1/student/exams/$examId/answer', data: {
        'question_id': qId,
        'answer': answer,
      });
    } catch (e) {
      // Background save failed, maybe show a tiny toast? 
      debugPrint("Gagal menyimpan jawaban ke server: $e");
    }
  }

  void finishExamPrompt() {
    int answeredCount = answers.length;
    int totalCount = questions.length;
    
    Get.defaultDialog(
      title: "Selesai Ujian?",
      content: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text("Anda telah menjawab $answeredCount dari $totalCount soal."),
            const SizedBox(height: 12),
            const Text(
              "Apakah Anda yakin ingin mengakhiri ujian? Jawaban tidak dapat diubah lagi setelah ini.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.red),
            ),
          ],
        ),
      ),
      textConfirm: "Akhiri Ujian",
      textCancel: "Batal",
      confirmTextColor: Colors.white,
      buttonColor: Colors.deepPurple,
      onConfirm: () {
        Get.back(); // close dialog
        _submitExam();
      },
    );
  }

  Future<void> _submitExam() async {
    Get.dialog(
      const Center(child: CircularProgressIndicator()),
      barrierDismissible: false,
    );
    
    try {
      String baseUrl = GetPlatform.isAndroid ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080';
      final res = await _dio.post('$baseUrl/api/v1/student/exams/$examId/finish');
      
      Get.back(); // close loading
      
      if (res.statusCode == 200) {
        _timer?.cancel();
        Get.offAllNamed('/home');
        Get.snackbar(
          "Ujian Selesai",
          "Jawaban ujian Anda telah berhasil dikumpulkan.",
          backgroundColor: Colors.green,
          colorText: Colors.white,
          duration: const Duration(seconds: 5),
        );
      }
    } catch (e) {
      Get.back();
      Get.snackbar("Error", "Gagal mengakhiri ujian. Periksa koneksi internet.", backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  Future<void> _forceSubmitExam() async {
    Get.dialog(
      const AlertDialog(
        title: Text("Waktu Habis!"),
        content: Text("Waktu pengerjaan ujian telah habis. Jawaban akan dikumpulkan otomatis."),
      ),
      barrierDismissible: false,
    );
    
    await Future.delayed(const Duration(seconds: 3));
    Get.back();
    await _submitExam();
  }
}
