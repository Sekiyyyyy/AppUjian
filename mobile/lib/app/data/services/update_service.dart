import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api_client.dart';
import '../../theme/app_theme.dart';

class UpdateService {
  // Versi aplikasi yang sedang terpasang di perangkat saat ini
  static const String currentVersion = "1.0.0";
  static const int currentBuildNumber = 1;

  static bool _hasChecked = false;

  /// Memeriksa pembaruan aplikasi ke backend
  static Future<void> checkForUpdate({bool isManualCheck = false}) async {
    // Hindari double check saat otomatis berjalan di startup
    if (_hasChecked && !isManualCheck) return;
    _hasChecked = true;

    try {
      final dio = ApiClient().dio;
      final response = await dio.get('/api/v1/app/version');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final String latestVersion = data['latest_version'] ?? currentVersion;
        final bool forceUpdate = data['force_update'] ?? false;
        final String downloadUrl = data['download_url'] ?? 'https://ujian.tiksmkn1beringin.my.id/download';
        final String title = data['title'] ?? 'Pembaruan Aplikasi Tersedia';
        
        List<String> changelog = [];
        if (data['changelog'] != null) {
          changelog = List<String>.from(data['changelog']);
        }

        // Bandingkan apakah versi server lebih baru dari aplikasi saat ini
        if (_isVersionNewer(latestVersion, currentVersion)) {
          _showUpdateDialog(
            latestVersion: latestVersion,
            forceUpdate: forceUpdate,
            downloadUrl: downloadUrl,
            title: title,
            changelog: changelog,
          );
        } else if (isManualCheck) {
          Get.snackbar(
            'Aplikasi Sudah Terbaru',
            'Anda sedang menggunakan versi terbaru (v$currentVersion).',
            backgroundColor: Colors.green.shade600,
            colorText: Colors.white,
            snackPosition: SnackPosition.BOTTOM,
            margin: const EdgeInsets.all(16),
            borderRadius: 12,
          );
        }
      }
    } catch (e) {
      debugPrint('Gagal memeriksa pembaruan: $e');
    }
  }

  /// Membandingkan semver string (contoh: "1.0.1" vs "1.0.0")
  static bool _isVersionNewer(String remote, String local) {
    if (remote == local) return false;
    try {
      final rParts = remote.split('.').map(int.parse).toList();
      final lParts = local.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final r = i < rParts.length ? rParts[i] : 0;
        final l = i < lParts.length ? lParts[i] : 0;
        if (r > l) return true;
        if (r < l) return false;
      }
    } catch (_) {
      return remote != local;
    }
    return false;
  }

  /// Menampilkan popup dialog pembaruan aplikasi
  static void _showUpdateDialog({
    required String latestVersion,
    required bool forceUpdate,
    required String downloadUrl,
    required String title,
    required List<String> changelog,
  }) {
    Get.dialog(
      PopScope(
        canPop: !forceUpdate, // Cegah tombol back jika update wajib
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.system_update_rounded,
                  color: AppTheme.primaryColor,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: AppTheme.textPrimary,
                      ),
                    ),
                    Text(
                      'Versi v$latestVersion Tersedia',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 8),
              Text(
                'Telah tersedia pembaruan untuk aplikasi CBT Anda. Perbarui sekarang untuk fitur terbaru dan kestabilan ujian.',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  color: AppTheme.textSecondary,
                  height: 1.4,
                ),
              ),
              if (changelog.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  'Catatan Perubahan:',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: changelog.map((item) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                          Expanded(
                            child: Text(
                              item,
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade700),
                            ),
                          ),
                        ],
                      ),
                    )).toList(),
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    'Versi Anda saat ini: v$currentVersion',
                    style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          actions: [
            if (!forceUpdate)
              TextButton(
                onPressed: () => Get.back(),
                child: Text(
                  'Nanti Saja',
                  style: GoogleFonts.inter(color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                ),
              ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () async {
                final uri = Uri.parse(downloadUrl);
                try {
                  if (await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                } catch (e) {
                  debugPrint('Error membuka URL: $e');
                }
              },
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.download_rounded, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    'Perbarui Sekarang',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      barrierDismissible: !forceUpdate,
    );
  }
}
