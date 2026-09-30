import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../../../routes/app_pages.dart';
import '../../../theme/app_theme.dart';
import '../../../utils/app_toast.dart';
import '../../../data/api_client.dart';
import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ExamController extends GetxController with WidgetsBindingObserver {
  final _dio = ApiClient().dio;
  static const _kioskChannel = MethodChannel('com.smkn1beringin.cbt/kiosk');
  
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

  // Anti-Cheating & Lock Tracking
  final isExamLocked = false.obs;
  final lockReason = ''.obs;
  final violationCount = 0.obs;
  bool _isExamFinished = false;
  bool _wasInBackground = false;
  bool _isHandlingInAppAction = false;
  Timer? _mobileExitCheckTimer;
  AppLifecycleState? _currentLifecycleState;

  // Supervisor Pause Tracking
  final isExamPaused = false.obs;
  final pauseReason = ''.obs;
  Timer? _sessionMonitorTimer;

  // App Pinning Tracking
  bool _isPinningApproved = false;
  bool _isPinningPending = false;

  /// Whether we're running on a desktop platform (Windows/macOS/Linux)
  bool get _isDesktop =>
      !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
  
  @override
  void onInit() {
    super.onInit();
    WidgetsBinding.instance.addObserver(this);
    _setupKioskChannel();

    final args = Get.arguments;
    if (args != null) {
      examId = args['exam_id'];
      examTitle = args['title'] ?? 'Ujian';
      duration = args['duration'] ?? 90;
      examData = args['exam_data'];

      if (!kIsWeb && Platform.isAndroid) {
        // Android: Tampilkan perizinan sematkan aplikasi (App Pinning) DULU
        // Sesi ujian di server dan countdown timer HANYA dimulai setelah siswa menekan "Mengerti" (ACC)!
        _enableKioskMode();
      } else {
        // Desktop / iOS: Langsung mulai ujian
        _startExamProcess();
      }
    } else {
      errorMessage.value = "Data ujian tidak valid atau sesi kadaluarsa.";
      isLoading.value = false;
      // Redirect to main if args are lost due to refresh
      Future.delayed(const Duration(milliseconds: 500), () {
        Get.offAllNamed('/main');
      });
    }
  }

  void _setupKioskChannel() {
    _kioskChannel.setMethodCallHandler((call) async {
      if (call.method == 'onPinningRejected') {
        _handlePinningRejected(call.arguments?.toString());
      } else if (call.method == 'onPinningAccepted') {
        if (!_isPinningApproved) {
          _isPinningApproved = true;
          _isPinningPending = false;
          _startExamProcess();
        }
      }
    });
  }

  void _handlePinningRejected([String? reason]) async {
    if (_isExamFinished) return;
    _isExamFinished = true;
    _isPinningPending = false;
    _isPinningApproved = false;
    _mobileExitCheckTimer?.cancel();
    _sessionMonitorTimer?.cancel();
    _timer?.cancel();
    _stopAlarm();

    // Pastikan ongoing_exam_id dihapus agar HomeController TIDAK mengira keluar aplikasi!
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('ongoing_exam_id');
    } catch (_) {}

    await _disableKioskMode();
    Get.offAllNamed(Routes.MAIN);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (reason == 'disabled_in_settings') {
        AppToast.error(
          title: "Fitur Sematkan Layar Nonaktif",
          message: "Fitur 'Sematkan Aplikasi' (App Pinning) dinonaktifkan di pengaturan HP Anda. Harap aktifkan di menu Pengaturan Keamanan HP Anda agar dapat mengikuti ujian.",
        );
      } else {
        AppToast.error(
          title: "Perizinan Layar Ditolak",
          message: "Anda menolak perizinan sematkan aplikasi (Tidak, terima kasih). Anda wajib menyetujui sematan aplikasi untuk dapat memulai ujian.",
        );
      }
    });
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    _mobileExitCheckTimer?.cancel();
    _sessionMonitorTimer?.cancel();
    _disableKioskMode();
    _stopAlarm();
    super.onClose();
  }

  Future<void> _enableKioskMode() async {
    try {
      if (!kIsWeb && Platform.isAndroid) {
        _isPinningPending = true;
      }
      await _kioskChannel.invokeMethod('startLockTask');
    } catch (_) {}
  }

  Future<void> _disableKioskMode() async {
    try {
      _isPinningApproved = false;
      _isPinningPending = false;
      await _kioskChannel.invokeMethod('stopLockTask');
    } catch (_) {}
  }

  Future<void> _stopAlarm() async {
    try {
      await _kioskChannel.invokeMethod('stopAlarm');
    } catch (_) {}
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) async {
    _currentLifecycleState = state;
    if (_isExamFinished || isLoading.value || questions.isEmpty || isExamLocked.value || _isHandlingInAppAction || _isPinningPending || (!kIsWeb && Platform.isAndroid && !_isPinningApproved)) {
      return;
    }

    if (state == AppLifecycleState.resumed) {
      // Kembali ke dalam aplikasi: batalkan timer cek keluar dan reset flag
      _mobileExitCheckTimer?.cancel();
      _mobileExitCheckTimer = null;
      _wasInBackground = false;
      return;
    }

    if (_isDesktop) {
      // Desktop (Windows / macOS / Linux)
      // Di desktop TIDAK ADA tombol power layar mati seperti di HP.
      // Setiap kali aplikasi kehilangan fokus (inactive, paused, hidden) atau di-minimize / alt-tab:
      // Ujian LANGSUNG DIKUNCI seketika tanpa celah!
      if (state == AppLifecycleState.inactive ||
          state == AppLifecycleState.paused ||
          state == AppLifecycleState.hidden) {
        bool isFg = false;
        try {
          isFg = await _kioskChannel.invokeMethod<bool>('isWindowForeground') ?? false;
        } catch (_) {
          isFg = false;
        }

        if (!isFg) {
          if (!_wasInBackground) {
            _wasInBackground = true;
            _lockExamSession("Terdeteksi keluar dari aplikasi ujian (Desktop)");
          }
        }
      }
      return;
    }

    // Mobile (Android & iOS)
    // Hanya periksa ketika aplikasi masuk background (paused atau hidden)
    // Abaikan state 'inactive' di mobile karena terjadi sesaat ketika tombol power dipencet
    if (state == AppLifecycleState.paused || state == AppLifecycleState.hidden) {
      _mobileExitCheckTimer?.cancel();
      // Beri jeda 1.2 detik untuk memastikan transisi layar mati (tombol power) selesai.
      // Jika layar mati (tombol power dipencet), isScreenInteractive bernilai false -> TIDAK dikunci.
      // Hanya kunci ujian jika layar masih hidup dan siswa benar-benar berada di luar aplikasi ujian!
      _mobileExitCheckTimer = Timer(const Duration(milliseconds: 1200), () async {
        if (_currentLifecycleState == AppLifecycleState.resumed || _isExamFinished || isExamLocked.value) {
          return;
        }

        bool isTrulyOutside = false;
        if (Platform.isAndroid) {
          try {
            isTrulyOutside = await _kioskChannel.invokeMethod<bool>('isScreenInteractive') ?? false;
          } catch (_) {
            isTrulyOutside = false;
          }
        } else {
          // iOS: jika 1.2 detik tetap paused/hidden, berarti keluar aplikasi
          isTrulyOutside = true;
        }

        if (isTrulyOutside) {
          // Siswa terdeteksi benar-benar keluar ke Home / aplikasi lain saat layar menyala
          _lockExamSession("Terdeteksi keluar dari aplikasi ke beranda/aplikasi lain");
        }
      });
    }
  }

  Future<void> _lockExamSession(String reason) async {
    if (isExamLocked.value || _isExamFinished) return;
    isExamLocked.value = true;
    _isExamFinished = true;
    lockReason.value = reason;
    violationCount.value++;
    _timer?.cancel();
    if (!_isDesktop) _stopAlarm();

    // Clear ongoing exam tracking
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('ongoing_exam_id');
    } catch (_) {}

    // 1. Notify backend immediately
    try {
      await _dio.post('/api/v1/student/exams/$examId/lock', data: {
        'reason': reason,
      });
    } catch (e) {
      debugPrint("Gagal mengunci sesi di server: $e");
    }

    // 2. Disable kiosk mode so device returns to normal
    await _disableKioskMode();

    // 3. Immediately redirect to Beranda (Home)
    Get.offAllNamed(Routes.MAIN);

    // 4. Show alert on Home screen
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AppToast.error(
        title: "Ujian Terkunci!",
        message: "Anda terdeteksi keluar dari aplikasi ujian. Sesi ujian Anda telah dikunci. Silakan hubungi proktor/pengawas/guru untuk membuka kunci ujian Anda.",
      );
    });
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

      // 1. Start Exam Session
      final startRes = await _dio.post('/api/v1/student/exams/$examId/start');
      if (_isExamFinished) return;
      if (startRes.statusCode == 201 || startRes.statusCode == 200) {
        final session = startRes.data;
        
        if (session['status'] == 'LOCKED') {
          _isExamFinished = true;
          await _disableKioskMode();
          Get.offAllNamed(Routes.MAIN);
          WidgetsBinding.instance.addPostFrameCallback((_) {
            AppToast.error(
              title: "Ujian Terkunci!",
              message: "Ujian ini masih terkunci. Silakan hubungi proktor/pengawas/guru untuk membuka kunci ujian Anda.",
            );
          });
          return;
        }

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
        _startSessionMonitor();
        
        // Save ongoing exam id to detect abrupt termination (Ctrl+Alt+Del, taskkill)
        await prefs.setInt('ongoing_exam_id', examId);

        // 2. Fetch Questions
        if (_isExamFinished) return;
        await _fetchQuestions();
      }
    } on DioException catch (e) {
      if (e.response?.data?['error'] == 'LOCKED') {
        _isExamFinished = true;
        await _disableKioskMode();
        Get.offAllNamed(Routes.MAIN);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.error(
            title: "Ujian Terkunci!",
            message: e.response?.data?['message'] ?? "Ujian ini masih terkunci. Silakan hubungi proktor/pengawas/guru untuk membuka kunci ujian Anda.",
          );
        });
        return;
      }
      if (e.response?.data?['error'] == 'WAITING_SUPERVISOR') {
        _isExamFinished = true;
        await _disableKioskMode();
        Get.offAllNamed(Routes.MAIN);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.info(
            title: "Menunggu Pengawas",
            message: e.response?.data?['message'] ?? "Ujian belum dimulai oleh guru pengawas ruang. Harap tunggu pengawas memulai sesi ujian.",
          );
        });
        return;
      }
      if (e.response?.data?['error'] == 'EXAM_PAUSED') {
        _isExamFinished = true;
        await _disableKioskMode();
        Get.offAllNamed(Routes.MAIN);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AppToast.warning(
            title: "Ujian Dihentikan Sementara",
            message: e.response?.data?['message'] ?? "Ujian sedang diberhentikan sementara oleh pengawas ruang.",
          );
        });
        return;
      }
      errorMessage.value = e.response?.data?['error'] ?? "Gagal memulai ujian.";
    } catch (e) {
      errorMessage.value = "Error: $e";
    } finally {
      isLoading.value = false;
    }
  }
  
  Future<void> _fetchQuestions() async {
    final res = await _dio.get('/api/v1/student/exams/$examId/questions');
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
      if (isExamPaused.value) {
        // Countdown dibekukan sementara saat pengawas menghentikan ujian
        return;
      }
      if (timeRemaining.value > 0) {
        timeRemaining.value--;
      } else {
        timer.cancel();
        _forceSubmitExam();
      }
    });
  }

  void _startSessionMonitor() {
    _sessionMonitorTimer?.cancel();
    _sessionMonitorTimer = Timer.periodic(const Duration(seconds: 4), (_) async {
      if (_isExamFinished || isExamLocked.value) return;

      // Anti-Cheating: Pada perangkat Android, pastikan mode semat (App Pinning) tetap aktif
      if (!kIsWeb && Platform.isAndroid) {
        try {
          final isPinned = await _kioskChannel.invokeMethod<bool>('isLockTaskActive') ?? false;
          if (!isPinned && _isPinningApproved && !_isPinningPending) {
            _lockExamSession("Terdeteksi melepas sematan aplikasi (Unpin) saat ujian");
            return;
          }
        } catch (_) {}
      }

      try {
        final res = await _dio.get('/api/v1/student/exams/$examId/session');
        if (res.statusCode == 200) {
          final data = res.data;
          final status = data['status']?.toString();
          final reason = data['lock_reason']?.toString() ?? '';

          if (status == 'PAUSED') {
            if (!isExamPaused.value) {
              isExamPaused.value = true;
              pauseReason.value = reason.isNotEmpty 
                  ? reason 
                  : "Ujian diberhentikan sementara oleh pengawas karena suasana berisik.";
            }
          } else if (status == 'ONGOING') {
            if (isExamPaused.value) {
              isExamPaused.value = false;
              pauseReason.value = '';
              AppToast.success(
                title: "Ujian Dilanjutkan",
                message: "Pengawas telah melanjutkan kembali sesi ujian. Silakan lanjutkan pengerjaan Anda.",
              );
            }
          } else if (status == 'LOCKED') {
            _lockExamSession(reason.isNotEmpty ? reason : "Sesi ujian dikunci oleh pengawas.");
          }
        }
      } catch (_) {}
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
    if (isExamPaused.value) {
      AppToast.warning(
        title: "Ujian Dihentikan",
        message: "Ujian sedang dihentikan sementara oleh pengawas. Anda tidak dapat mengisi jawaban saat ini.",
      );
      return;
    }
    if (questions.isEmpty) return;
    final qId = questions[currentIndex.value]['id'];
    
    // Update local UI immediately
    answers[qId] = answer;
    
    // Sync to server in background
    try {
      await _dio.post('/api/v1/student/exams/$examId/answer', data: {
        'question_id': qId,
        'answer': answer,
      });
    } catch (e) {
      // Background save failed, maybe show a tiny toast? 
      debugPrint("Gagal menyimpan jawaban ke server: $e");
    }
  }

  void finishExamPrompt() {
    _isHandlingInAppAction = true;
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
                        color: (allAnswered ? const Color(0xFF10B981) : const Color(0xFFF59E0B)).withValues(alpha: 0.35),
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
                        onPressed: () {
                          _isHandlingInAppAction = false;
                          Get.back();
                        },
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
                          shadowColor: const Color(0xFF1A9E4E).withValues(alpha: 0.4),
                        ),
                        onPressed: () {
                          _isHandlingInAppAction = true;
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
    ).then((_) {
      _isHandlingInAppAction = false;
    });
  }

  Future<void> _submitExam() async {
    _isHandlingInAppAction = true;
    _isExamFinished = true;

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
      final res = await _dio.post('/api/v1/student/exams/$examId/finish');
      
      Get.back(); // close loading
      
      if (res.statusCode == 200) {
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('ongoing_exam_id');
        } catch (_) {}
        _isExamFinished = true;
        _disableKioskMode();
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
      // Provide retry or exit option so the student is never trapped in kiosk mode
      Get.dialog(
        Dialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.wifi_off_rounded, color: Colors.amber.shade700, size: 44),
                const SizedBox(height: 12),
                Text(
                  "Gagal Terhubung ke Server",
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
                const SizedBox(height: 8),
                Text(
                  "Tidak dapat mengirim data ujian ke server. Periksa koneksi internet Anda.",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 13, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          _isExamFinished = true;
                          _timer?.cancel();
                          await _disableKioskMode();
                          Get.back();
                          Get.offAllNamed(Routes.MAIN);
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          side: BorderSide(color: Colors.grey.shade300),
                          foregroundColor: AppTheme.textPrimary,
                        ),
                        child: Text("Keluar Saja", style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Get.back();
                          _submitExam();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text("Coba Lagi", style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        barrierDismissible: false,
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
