import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/home_controller.dart';
import '../../../theme/app_theme.dart';

class HistoryView extends GetView<HomeController> {
  const HistoryView({super.key});

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
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: RefreshIndicator(
            onRefresh: controller.fetchExams,
            color: AppTheme.primaryColor,
            child: Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
              }

              if (controller.historyExams.isEmpty) {
                return LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(minHeight: constraints.maxHeight),
                      child: Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
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
                                      color: Colors.black.withValues(alpha: 0.05),
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
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }

              return ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 100),
                itemCount: controller.historyExams.length,
                itemBuilder: (context, index) {
                  final exam = controller.historyExams[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: _buildHistoryCard(context, exam),
                  );
                },
              );
            }),
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryCard(BuildContext context, dynamic exam) {
    final status = exam['session_status']?.toString() ?? 'BELUM MULAI';
    final isFinished = status == 'FINISHED' || status == 'SUBMITTED' || status == 'SELESAI';
    final isTimeout = status == 'TIMEOUT';
    final isLocked = status == 'LOCKED';

    Color bgColor;
    Color borderColor;
    Color textColor;
    Color iconColor;
    IconData statusIcon;
    String statusLabel;

    if (isFinished) {
      bgColor = Colors.green.shade50;
      borderColor = Colors.green.shade100;
      textColor = Colors.green.shade700;
      iconColor = Colors.green.shade600;
      statusIcon = Icons.check_circle_rounded;
      statusLabel = 'Selesai';
    } else if (isTimeout) {
      bgColor = Colors.red.shade50;
      borderColor = Colors.red.shade100;
      textColor = Colors.red.shade700;
      iconColor = Colors.red.shade600;
      statusIcon = Icons.timer_off_rounded;
      statusLabel = 'Waktu Habis';
    } else if (isLocked) {
      bgColor = Colors.red.shade50;
      borderColor = Colors.red.shade100;
      textColor = Colors.red.shade700;
      iconColor = Colors.red.shade600;
      statusIcon = Icons.lock_rounded;
      statusLabel = 'Terkunci';
    } else {
      bgColor = Colors.amber.shade50;
      borderColor = Colors.amber.shade100;
      textColor = Colors.amber.shade800;
      iconColor = Colors.amber.shade700;
      statusIcon = Icons.event_busy_rounded;
      statusLabel = 'Terlewat';
    }

    final screenWidth = MediaQuery.of(context).size.width;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade100),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    exam['title']?.toString() ?? 'Tanpa Judul',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary,
                      height: 1.3,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: borderColor),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 12, color: iconColor),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: GoogleFonts.inter(
                          color: textColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 14,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.menu_book_rounded, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 6),
                    ConstrainedBox(
                      constraints: BoxConstraints(
                        maxWidth: screenWidth < 360 ? 130 : 260,
                      ),
                      child: Text(
                        exam['subject']?['name']?.toString() ?? 'Umum',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.schedule_rounded, size: 14, color: AppTheme.textSecondary),
                    const SizedBox(width: 4),
                    Text(
                      '${exam['duration'] ?? 0} Menit',
                      style: GoogleFonts.inter(
                        color: AppTheme.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
