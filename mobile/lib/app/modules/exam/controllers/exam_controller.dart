import 'package:google_fonts/google_fonts.dart';
import '../../../routes/app_pages.dart';
import '../../../theme/app_theme.dart';
import '../../../utils/app_toast.dart';
import '../../../data/api_client.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ExamController extends GetxController {
  final _dio = ApiClient().dio;
  
  // Passed arguments
  int examId = 0;
  String examTitle = '';
  int duration = 0; // in minutes
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
      examTitle = args['title'] ?? 'Ujian';
      duration = args['duration'] ?? 90;
      examData = args['exam_data'];
      _startExamProcess();
    } else {
      errorMessage.value = "Data ujian tidak valid atau sesi kadaluarsa.";
      isLoading.value = false;
      // Redirect to main if args are lost due to refresh
      Future.delayed(const Duration(milliseconds: 500), () {
        Get.offAllNamed('/main');
      });
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
      errorMessage.value = "Error: $e";
    } finally {
      isLoading.value = false;
    }
  }
  
  Future<void> _fetchQuestions(String baseUrl) async {
    final res = await _dio.get('$baseUrl/api/v1/student/exams/$examId/questions');
    if (res.statusCode == 200) {
      final List data = res.data['questions'] ?? [];
      for (var q in data) {
        if (q['id'] == null && q['ID'] != null) {
          q['id'] = q['ID'];
        }
      }
      questions.assignAll(data);
      // Initialize flagged state & restore previously answered questions
      for (var q in questions) {
        final qId = q['id'];
        flagged[qId] = false;
        if (q['student_answer'] != null && q['student_answer'].toString().isNotEmpty) {
          answers[qId] = q['student_answer'].toString();
        }
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
    int unansweredCount = totalCount - answeredCount;
    if (unansweredCount < 0) unansweredCount = 0;
    bool allAnswered = answeredCount >= totalCount && totalCount > 0;
    double progress = totalCount > 0 ? (answeredCount / totalCount).clamp(0.0, 1.0) : 0.0;

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        elevation: 16,
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Padding(
            padding: const EdgeInsets.all(28.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Top Visual Badge
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: allAnswered
                          ? [const Color(0xFF10B981), const Color(0xFF059669)]
                          : [const Color(0xFFF59E0B), const Color(0xFFD97706)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: (allAnswered ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withOpacity(0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Icon(
                    allAnswered ? Icons.assignment_turned_in_rounded : Icons.pending_actions_rounded,
                    size: 34,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 20),

                // Title
                Text(
                  allAnswered ? "Selesaikan Ujian?" : "Yakin Selesai Ujian?",
                  style: GoogleFonts.inter(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),

                // Subtitle
                Text(
                  allAnswered
                      ? "Hebat! Semua pertanyaan telah Anda jawab."
                      : "Masih terdapat soal yang belum dijawab.",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppTheme.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 20),

                // Progress Tracker Box
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Progres Jawaban",
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.textPrimary,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: allAnswered ? Colors.green.shade50 : Colors.amber.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: allAnswered ? Colors.green.shade200 : Colors.amber.shade200,
                              ),
                            ),
                            child: Text(
                              "$answeredCount dari $totalCount Soal",
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: allAnswered ? Colors.green.shade800 : Colors.amber.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: progress,
                          minHeight: 8,
                          backgroundColor: Colors.grey.shade200,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            allAnswered ? const Color(0xFF10B981) : AppTheme.primaryColor,
                          ),
                        ),
                      ),
                      if (!allAnswered) ...[
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Icon(Icons.info_outline_rounded, size: 14, color: Colors.amber.shade800),
                            const SizedBox(width: 6),
                            Text(
                              "$unansweredCount soal belum dijawab",
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: Colors.amber.shade900,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Notice Banner
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 18, color: Colors.red.shade600),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          "Setelah dikumpulkan, lembar jawaban tidak dapat diubah kembali.",
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.red.shade800,
                            fontWeight: FontWeight.w500,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                          foregroundColor: AppTheme.textPrimary,
                        ),
                        onPressed: () => Get.back(),
                        child: Text(
                          "Periksa Lagi",
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          backgroundColor: const Color(0xFF1A9E4E),
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shadowColor: const Color(0xFF1A9E4E).withOpacity(0.4),
                        ),
                        onPressed: () {
                          Get.back();
                          _submitExam();
                        },
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.check_circle_rounded, size: 18),
                            const SizedBox(width: 6),
                            Text(
                              "Kumpulkan",
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      barrierDismissible: true,
    );
  }

  Future<void> _submitExam() async {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(color: AppTheme.primaryColor),
              const SizedBox(width: 20),
              Flexible(
                child: Text(
                  "Menyimpan jawaban ujian...",
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.textPrimary),
                ),
              ),
            ],
          ),
        ),
      ),
      barrierDismissible: false,
    );
    
    try {
      String baseUrl = GetPlatform.isAndroid ? 'http://10.0.2.2:8080' : 'http://127.0.0.1:8080';
      final res = await _dio.post('$baseUrl/api/v1/student/exams/$examId/finish');
      
      Get.back(); // close loading
      
      if (res.statusCode == 200) {
        _timer?.cancel();
        Get.offAllNamed(Routes.MAIN);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.success(
            title: "Ujian Berhasil Dikumpulkan",
            message: "Jawaban Anda telah tersimpan dengan aman di server.",
          );
        });
      }
    } catch (e) {
      Get.back();
      AppToast.error(
        title: "Gagal Mengumpulkan",
        message: "Terjadi kesalahan saat menyimpan jawaban. Periksa koneksi internet Anda.",
      );
    }
  }

  Future<void> _forceSubmitExam() async {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: Colors.red.shade50, shape: BoxShape.circle),
                child: Icon(Icons.timer_off_rounded, color: Colors.red.shade600, size: 36),
              ),
              const SizedBox(height: 16),
              Text(
                "Waktu Ujian Habis!",
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
              ),
              const SizedBox(height: 8),
              Text(
                "Waktu pengerjaan telah berakhir. Jawaban Anda sedang dikumpulkan secara otomatis...",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary, height: 1.4),
              ),
            ],
          ),
        ),
      ),
      barrierDismissible: false,
    );
    
    await Future.delayed(const Duration(seconds: 2));
    Get.back();
    await _submitExam();
  }
}
