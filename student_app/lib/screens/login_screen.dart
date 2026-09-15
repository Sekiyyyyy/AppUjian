import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';
import 'exam_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _nisnController = TextEditingController();
  final _tokenController = TextEditingController();
  bool _isLoading = false;
  bool _isScanning = false;

  Future<void> _handleLogin() async {
    if (_nisnController.text.isEmpty || _tokenController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('NISN dan Token harus diisi')),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    final result = await ApiService.login(
      _nisnController.text.trim(),
      _tokenController.text.trim(),
    );

    setState(() => _isLoading = false);

    if (!mounted) return;

    if (result['success']) {
      // Navigate to Exam Screen and prevent going back
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const ExamScreen()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message']),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _onQRScanned(BarcodeCapture capture) {
    if (_isScanning) {
      final List<Barcode> barcodes = capture.barcodes;
      if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
        final code = barcodes.first.rawValue!;
        
        // Assume QR code contains just the token string for now
        setState(() {
          _tokenController.text = code;
          _isScanning = false;
        });
        
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QR Code berhasil di-scan!')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: _isScanning ? _buildScanner() : _buildLoginForm(),
          ),
        ),
      ),
    );
  }

  Widget _buildScanner() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'Scan QR Code Token Ujian',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 24),
        Container(
          height: 300,
          width: 300,
          clipBehavior: Clip.hardEdge,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Theme.of(context).primaryColor, width: 4),
          ),
          child: MobileScanner(
            onDetect: _onQRScanned,
          ),
        ),
        const SizedBox(height: 24),
        TextButton.icon(
          onPressed: () => setState(() => _isScanning = false),
          icon: const Icon(Icons.close),
          label: const Text('Batal Scan'),
        ),
      ],
    );
  }

  Widget _buildLoginForm() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Image.network(
            'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Tut_Wuri_Handayani.svg/1024px-Tut_Wuri_Handayani.svg.png',
            height: 80,
          ),
          const SizedBox(height: 16),
          const Text(
            'CBT SMK N 1 Beringin',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Silakan masukkan NISN dan Token atau scan QR Code yang diberikan oleh pengawas.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Colors.grey),
          ),
          const SizedBox(height: 32),
          
          TextField(
            controller: _nisnController,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: 'NISN',
              prefixIcon: const Icon(Icons.person_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
          const SizedBox(height: 16),
          
          TextField(
            controller: _tokenController,
            decoration: InputDecoration(
              labelText: 'Token Ujian',
              prefixIcon: const Icon(Icons.vpn_key_outlined),
              suffixIcon: IconButton(
                icon: const Icon(Icons.qr_code_scanner),
                color: Theme.of(context).primaryColor,
                onPressed: () => setState(() => _isScanning = true),
              ),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
            ),
          ),
          const SizedBox(height: 32),
          
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : ElevatedButton(
                  onPressed: _handleLogin,
                  child: const Text('Masuk Ujian'),
                ),
        ],
      ),
    );
  }
}
