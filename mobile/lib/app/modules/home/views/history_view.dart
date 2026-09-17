import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/home_controller.dart';
import '../../../theme/app_theme.dart';

class HistoryView extends GetView<HomeController> {
  const HistoryView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(
          'Riwayat Ujian',
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
        }

        if (controller.historyExams.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      )
                    ],
                  ),
                  child: Icon(Icons.history_rounded, size: 48, color: Colors.grey.shade300),
                ),
                const SizedBox(height: 24),
                Text(
                  'Belum Ada Riwayat',
                  style: GoogleFonts.inter(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ujian yang sudah selesai akan muncul di sini.',
                  style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 100),
          itemCount: controller.historyExams.length,
          itemBuilder: (context, index) {
            final exam = controller.historyExams[index];
            final status = exam['session_status'];
            final isTimeout = status == 'TIMEOUT';
            
            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade100),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.02),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            exam['title']?.toString() ?? 'Tanpa Judul',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textPrimary,
                              height: 1.3,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isTimeout ? Colors.red.shade50 : Colors.green.shade50,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: isTimeout ? Colors.red.shade100 : Colors.green.shade100,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isTimeout ? Icons.timer_off_rounded : Icons.check_circle_rounded,
                                size: 12,
                                color: isTimeout ? Colors.red.shade600 : Colors.green.shade600,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isTimeout ? 'Waktu Habis' : 'Selesai',
                                style: GoogleFonts.inter(
                                  color: isTimeout ? Colors.red.shade700 : Colors.green.shade700,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Icon(Icons.menu_book_rounded, size: 14, color: AppTheme.textSecondary),
                        const SizedBox(width: 6),
                        Text(
                          exam['subject']?['name']?.toString() ?? 'Umum',
                          style: GoogleFonts.inter(
                            color: AppTheme.textSecondary,
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      }),
    );
  }
}
