import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ExamScreen extends StatefulWidget {
  const ExamScreen({super.key});

  @override
  State<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends State<ExamScreen> with WidgetsBindingObserver {
  int _timeLeft = 3600; // 60 minutes
  Timer? _timer;
  bool _isSubmitted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  // ANTI-CHEATING: Detect if user minimizes or switches app
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      if (!_isSubmitted) {
        _forceSubmitAndLogout("Aplikasi ditutup atau diminimize! Ujian otomatis dihentikan karena indikasi kecurangan.");
      }
    }
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_timeLeft > 0) {
        setState(() => _timeLeft--);
      } else {
        _timer?.cancel();
        _forceSubmitAndLogout("Waktu Habis!");
      }
    });
  }

  String get _formattedTime {
    final minutes = (_timeLeft / 60).floor().toString().padLeft(2, '0');
    final seconds = (_timeLeft % 60).toString().padLeft(2, '0');
    return "$minutes:$seconds";
  }

  Future<void> _forceSubmitAndLogout(String reason) async {
    setState(() => _isSubmitted = true);
    _timer?.cancel();
    
    // Call logout/submit to API here...
    await ApiService.logout();

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Ujian Dihentikan', style: TextStyle(color: Colors.red)),
        content: Text(reason),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (context) => const LoginScreen()),
                (route) => false,
              );
            },
            child: const Text('Kembali ke Login'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitExam() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Kumpulkan Ujian?'),
        content: const Text('Pastikan semua jawaban sudah terisi. Anda tidak dapat kembali setelah ini.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Kumpulkan'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      _forceSubmitAndLogout("Ujian berhasil dikumpulkan.");
    }
  }

  @override
  Widget build(BuildContext context) {
    // PopScope prevents Android back button
    return PopScope(
      canPop: false,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tombol kembali dinonaktifkan selama ujian.')),
        );
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          backgroundColor: Theme.of(context).primaryColor,
          foregroundColor: Colors.white,
          title: const Text('Ujian Sedang Berlangsung', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          actions: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: _timeLeft < 300 ? Colors.red : Colors.black26,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Center(
                child: Text(
                  _formattedTime,
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1),
                ),
              ),
            ),
          ],
        ),
        body: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Expanded(
                child: Center(
                  child: Text(
                    'Form Ujian Pilihan Ganda\n\n(Soal akan dimuat dari Backend Go)',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                ),
              ),
              ElevatedButton(
                onPressed: _submitExam,
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Selesai & Kumpulkan'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
