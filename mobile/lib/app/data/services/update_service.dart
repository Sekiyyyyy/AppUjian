import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api_client.dart';
import '../app_version.dart';
import '../../theme/app_theme.dart';

class UpdateService {
  // Versi aplikasi saat ini
  static const String currentVersion = AppVersion.currentVersion;
  static const int currentBuildNumber = AppVersion.currentBuildNumber;

  // Status reaktif apakah pembaruan wajib sedang aktif
  static final RxBool isUpdateRequired = false.obs;
  static final RxString latestVersion = currentVersion.obs;
  static final RxInt latestBuild = currentBuildNumber.obs;
  static final RxString updateTitle = 'Pembaruan Wajib Aplikasi CBT'.obs;
  static final RxList<String> changelog = <String>[].obs;
  static final RxString downloadUrl = 'https://ujian.tiksmkn1beringin.my.id/download'.obs;
  static final RxBool isChecking = false.obs;

  static bool _dialogShowing = false;

  /// Memeriksa pembaruan aplikasi ke backend
  static Future<bool> checkForUpdate({bool isManualCheck = false}) async {
    isChecking.value = true;
    try {
      final dio = ApiClient().dio;
      final response = await dio.get('/api/v1/app/version');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data;
        final String remoteLatestVersion = data['latest_version']?.toString() ?? currentVersion;
        final int remoteBuild = data['build_number'] is int ? data['build_number'] : int.tryParse(data['build_number']?.toString() ?? '') ?? currentBuildNumber;
        final String remoteMinVersion = data['min_version']?.toString() ?? '1.0.0';
        final bool forceUpdate = data['force_update'] ?? false;
        final String remoteDownloadUrl = data['download_url']?.toString() ?? 'https://ujian.tiksmkn1beringin.my.id/download';
        final String remoteTitle = data['title']?.toString() ?? 'Pembaruan Wajib Aplikasi CBT';

        List<String> remoteChangelog = [];
        if (data['changelog'] != null) {
          remoteChangelog = List<String>.from(data['changelog']);
        }

        latestVersion.value = remoteLatestVersion;
        latestBuild.value = remoteBuild;
        downloadUrl.value = remoteDownloadUrl;
        updateTitle.value = remoteTitle;
        changelog.assignAll(remoteChangelog);

        // Evaluasi apakah versi server lebih baru atau update diwajibkan
        final bool hasNewerVersion = _isVersionNewer(remoteLatestVersion, currentVersion) || (remoteBuild > currentBuildNumber);
        final bool isBelowMinVersion = _isVersionNewer(remoteMinVersion, currentVersion);
        final bool shouldForce = hasNewerVersion || isBelowMinVersion || forceUpdate;

        if (hasNewerVersion || shouldForce) {
          isUpdateRequired.value = true;
          _showUpdateDialog();
          return true;
        } else {
          isUpdateRequired.value = false;
          if (_dialogShowing && Get.isDialogOpen == true) {
            Get.back();
            _dialogShowing = false;
          }
          if (isManualCheck) {
            Get.snackbar(
              'Aplikasi Sudah Terbaru',
              'Anda sedang menggunakan versi terbaru (v$currentVersion).',
              backgroundColor: Colors.green.shade600,
              colorText: Colors.white,
              snackPosition: SnackPosition.BOTTOM,
              margin: const EdgeInsets.all(16),
              borderRadius: 12,
              icon: const Icon(Icons.check_circle_outline, color: Colors.white),
            );
          }
          return false;
        }
      }
    } catch (e) {
      debugPrint('Gagal memeriksa pembaruan aplikasi: $e');
    } finally {
      isChecking.value = false;
    }
    return isUpdateRequired.value;
  }

  /// Dipanggil ketika backend merespons 426 Upgrade Required
  static void onUpgradeRequired(Map<String, dynamic>? data) {
    if (data != null) {
      if (data['latest_version'] != null) {
        latestVersion.value = data['latest_version'].toString();
      }
      if (data['download_url'] != null) {
        downloadUrl.value = data['download_url'].toString();
      }
    }
    isUpdateRequired.value = true;
    _showUpdateDialog();
  }

  /// Membandingkan semver string (contoh: "1.0.8" vs "1.0.7")
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

  /// Membuka tautan download installer / APK aplikasi
  static Future<void> openDownloadUrl() async {
    final uri = Uri.parse(downloadUrl.value);
    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched) {
        await launchUrl(
          uri,
          mode: LaunchMode.platformDefault,
        );
      }
    } catch (e) {
      debugPrint('Error membuka URL unduhan (external): $e');
      try {
        await launchUrl(uri);
      } catch (err) {
        debugPrint('Error membuka URL unduhan (fallback): $err');
      }
    }
  }

  /// Menampilkan popup dialog pembaruan wajib aplikasi (tidak bisa ditutup/dilewati)
  static void _showUpdateDialog() {
    if (_dialogShowing && Get.isDialogOpen == true) return;
    _dialogShowing = true;

    Get.dialog(
      PopScope(
        canPop: false, // TIDAK BISA DI-BACK/DITUTUP KARENA WAJIB UPDATE
        child: AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Icon(
                  Icons.system_security_update_rounded,
                  color: Colors.red.shade600,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pembaruan Wajib',
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: Colors.red.shade800,
                      ),
                    ),
                    Obx(() => Text(
                      'Versi v${latestVersion.value} Wajib Dipasang',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.primaryColor,
                      ),
                    )),
                  ],
                ),
              ),
            ],
          ),
          content: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Warning Banner
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded, size: 20, color: Colors.red.shade700),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Demi keamanan, kestabilan, dan keadilan ujian, aplikasi versi ini WAJIB diperbarui sebelum dapat digunakan.',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.red.shade900,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Version Badge Comparison
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Text(
                        'Versi Lama: v$currentVersion',
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 14, color: Colors.grey),
                    const SizedBox(width: 8),
                    Obx(() => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.green.shade300),
                      ),
                      child: Text(
                        'Versi Baru: v${latestVersion.value}',
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.green.shade700),
                      ),
                    )),
                  ],
                ),

                // Changelog
                Obx(() {
                  if (changelog.isEmpty) return const SizedBox.shrink();
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 14),
                      Text(
                        'Catatan Pembaruan:',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 120),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: SingleChildScrollView(
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
                                      style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade800),
                                    ),
                                  ),
                                ],
                              ),
                            )).toList(),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      side: BorderSide(color: Colors.grey.shade300),
                    ),
                    onPressed: () => checkForUpdate(isManualCheck: true),
                    icon: Obx(() => isChecking.value 
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh_rounded, size: 16)),
                    label: Text(
                      'Periksa Kembali',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 12, color: Colors.grey.shade700),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: openDownloadUrl,
                    icon: const Icon(Icons.download_rounded, size: 18),
                    label: Text(
                      'Unduh Sekarang',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      barrierDismissible: false,
    ).then((_) {
      _dialogShowing = false;
      // Jika masih required tapi dialog tertutup oleh sistem, trigger ulang
      if (isUpdateRequired.value) {
        Future.delayed(const Duration(milliseconds: 300), () {
          if (isUpdateRequired.value) {
            _showUpdateDialog();
          }
        });
      }
    });
  }
}
