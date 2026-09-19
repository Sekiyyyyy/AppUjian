import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/home_controller.dart';
import '../../../theme/app_theme.dart';

class HomeView extends GetView<HomeController> {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      body: RefreshIndicator(
        onRefresh: controller.fetchExams,
        color: AppTheme.primaryColor,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          slivers: [
            SliverAppBar(
              automaticallyImplyLeading: false, // Sembunyikan tombol back bawaan
              expandedHeight: 280.0,
              floating: false,
              pinned: true,
              backgroundColor: AppTheme.primaryColor,
              elevation: 0,
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  children: [
                    // Gradient Background
                    Container(
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                        ),
                      ),
                    ),
                    // Decorative Circles
                    Positioned(
                      right: -80,
                      top: -40,
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                    ),
                    Positioned(
                      left: -50,
                      bottom: -50,
                      child: Container(
                        width: 180,
                        height: 180,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withValues(alpha: 0.05),
                        ),
                      ),
                    ),
                    // Content
                    ClipRect(
                      child: OverflowBox(
                        minHeight: 280,
                        maxHeight: 280,
                        alignment: Alignment.topCenter,
                        child: SafeArea(
                          child: Center(
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(maxWidth: 960),
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(24, 60, 24, 24),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Selamat Datang,',
                                        style: GoogleFonts.inter(
                                          color: Colors.white.withValues(alpha: 0.8),
                                          fontSize: 16,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Obx(() => Text(
                                        controller.studentName.value,
                                        style: GoogleFonts.inter(
                                          color: Colors.white,
                                          fontSize: 28,
                                          fontWeight: FontWeight.bold,
                                          letterSpacing: -0.5,
                                        ),
                                      )),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: Colors.white,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4))
                                    ]
                                  ),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(40),
                                    child: Image.asset(
                                      'assets/images/logo.png',
                                      width: 60,
                                      height: 60,
                                      fit: BoxFit.contain,
                                      errorBuilder: (context, error, stackTrace) {
                                        // Fallback if logo fails to load (e.g. before pub get)
                                        return Container(
                                          width: 60,
                                          height: 60,
                                          color: Colors.grey.shade200,
                                          child: const Icon(Icons.school_rounded, color: Colors.grey),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            // Glassmorphic Info Card
                            ClipRRect(
                              borderRadius: BorderRadius.circular(20),
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(10),
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(alpha: 0.2),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.person_outline, color: Colors.white, size: 24),
                                      ),
                                      const SizedBox(width: 16),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'NISN / NIS',
                                              style: GoogleFonts.inter(
                                                color: Colors.white.withValues(alpha: 0.7),
                                                fontSize: 12,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Obx(() => Text(
                                              controller.studentNis.value,
                                              style: GoogleFonts.inter(
                                                color: Colors.white,
                                                fontSize: 15,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: 0.5,
                                              ),
                                            )),
                                          ],
                                        ),
                                      ),
                                      Obx(() {
                                        if (controller.className.value.isEmpty || controller.className.value == '-') {
                                          return const SizedBox.shrink();
                                        }
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: Colors.white.withValues(alpha: 0.2),
                                            borderRadius: BorderRadius.circular(12),
                                            border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Icon(Icons.school_outlined, color: Colors.white, size: 14),
                                              const SizedBox(width: 6),
                                              Text(
                                                controller.className.value,
                                                style: GoogleFonts.inter(
                                                  color: Colors.white,
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),

            SliverToBoxAdapter(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 960),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.assignment_rounded, color: AppTheme.primaryColor, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Ujian Aktif',
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Obx(() {
              if (controller.isLoading.value) {
                return const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              if (controller.activeExams.isEmpty) {
                return SliverToBoxAdapter(
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 960),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
                        child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(28),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.08),
                                  blurRadius: 30,
                                  offset: const Offset(0, 10),
                                  spreadRadius: 5,
                                ),
                              ],
                            ),
                            child: Icon(Icons.coffee_rounded, size: 56, color: Colors.grey.shade300),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            'Belum Ada Ujian',
                            style: GoogleFonts.inter(
                              color: AppTheme.textPrimary,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Santai dulu, tidak ada jadwal ujian yang aktif\nuntuk Anda saat ini.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14, height: 1.5),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
              }

              return SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final exam = controller.activeExams[index];
                      final isOngoing = exam['session_status'] == 'ONGOING';
                      final isUpcoming = DateTime.parse(exam['start_time']).toLocal().isAfter(DateTime.now());
                      
                      return Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 960),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 20),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: AppTheme.primaryColor.withValues(alpha: 0.06),
                                  blurRadius: 24,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () {
                                  _showStartExamDialog(context, exam, isOngoing);
                                },
                                borderRadius: BorderRadius.circular(24),
                                splashColor: AppTheme.primaryColor.withValues(alpha: 0.1),
                                highlightColor: AppTheme.primaryColor.withValues(alpha: 0.05),
                                child: Padding(
                                  padding: const EdgeInsets.all(24),
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
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: AppTheme.textPrimary,
                                            height: 1.3,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 16),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                        decoration: BoxDecoration(
                                          color: isOngoing ? Colors.amber.shade50 : (isUpcoming ? Colors.blue.shade50 : AppTheme.primaryColor.withValues(alpha: 0.1)),
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: isOngoing ? Colors.amber.shade200 : (isUpcoming ? Colors.blue.shade200 : AppTheme.primaryColor.withValues(alpha: 0.2)),
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(
                                              isOngoing ? Icons.play_circle_fill_rounded : (isUpcoming ? Icons.schedule_rounded : Icons.check_circle_rounded),
                                              size: 14,
                                              color: isOngoing ? Colors.amber.shade700 : (isUpcoming ? Colors.blue.shade700 : AppTheme.primaryColor),
                                            ),
                                            const SizedBox(width: 4),
                                            Text(
                                              isOngoing ? 'Lanjut' : (isUpcoming ? 'Segera' : 'Tersedia'),
                                              style: GoogleFonts.inter(
                                                color: isOngoing ? Colors.amber.shade800 : (isUpcoming ? Colors.blue.shade800 : AppTheme.primaryColor),
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 24),
                                  Row(
                                    children: [
                                      _buildInfoChip(
                                        Icons.timer_outlined,
                                        '${exam['duration']} Menit',
                                      ),
                                      const SizedBox(width: 16),
                                      _buildInfoChip(
                                        Icons.menu_book_rounded,
                                        exam['subject']?['name']?.toString() ?? 'Umum',
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
                childCount: controller.activeExams.length,
                ),
              ),
            );
          }),
          
          // Panduan Ujian Section (To fill empty space at bottom)
          SliverToBoxAdapter(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 960),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 40),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.03),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: AppTheme.primaryColor.withValues(alpha: 0.1)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.lightbulb_outline_rounded, color: AppTheme.primaryColor, size: 20),
                            const SizedBox(width: 8),
                            Text("Panduan & Tata Tertib", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary)),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _buildRuleItem("1", "Pastikan koneksi internet Anda stabil sebelum memulai."),
                        _buildRuleItem("2", "Jangan keluar dari aplikasi saat ujian sedang berlangsung."),
                        _buildRuleItem("3", "Hubungi pengawas jika Anda mengalami kendala teknis."),
                        const SizedBox(height: 100), // padding for bottom nav
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

  Widget _buildInfoChip(IconData icon, String label) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppTheme.textSecondary),
        const SizedBox(width: 6),
        Text(
          label,
          style: GoogleFonts.inter(
            color: AppTheme.textSecondary,
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildRuleItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(number, style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppTheme.primaryColor, fontSize: 12)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(text, style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13, height: 1.5)),
          ),
        ],
      ),
    );
  }

  void _showStartExamDialog(BuildContext context, dynamic exam, bool isOngoing) {
    final isUpcoming = DateTime.parse(exam['start_time']).toLocal().isAfter(DateTime.now());
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 580),
          child: Container(
        padding: const EdgeInsets.all(32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: AppTheme.primaryColor.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
                  child: const Icon(Icons.assignment_rounded, color: AppTheme.primaryColor, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Persiapan Ujian", style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.bold)),
                      Text(exam['title']?.toString() ?? 'Ujian', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                    ],
                  ),
                )
              ],
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Mata Pelajaran", style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14)),
                      Text(exam['subject']?['name']?.toString() ?? 'Umum', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                    ],
                  ),
                  const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Waktu Pengerjaan", style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14)),
                      Text("${exam['duration']} Menit", style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                    ],
                  ),
                  const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Divider(height: 1)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Status", style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 14)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isOngoing ? Colors.amber.shade100 : (isUpcoming ? Colors.blue.shade100 : Colors.green.shade100),
                          borderRadius: BorderRadius.circular(12)
                        ),
                        child: Text(isOngoing ? "Sedang Dikerjakan" : (isUpcoming ? "Segera" : "Tersedia"), style: GoogleFonts.inter(color: isOngoing ? Colors.amber.shade800 : (isUpcoming ? Colors.blue.shade800 : Colors.green.shade800), fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Get.back(),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      side: BorderSide(color: Colors.grey.shade300)
                    ),
                    child: Text("Batal", style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: isUpcoming ? null : () {
                      Get.back(); // close modal
                      controller.startExam(exam); // Start exam
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isUpcoming ? Colors.grey.shade400 : AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 4,
                      shadowColor: AppTheme.primaryColor.withValues(alpha: 0.4)
                    ),
                    child: Text(isOngoing ? "Lanjutkan" : (isUpcoming ? "Belum Waktunya" : "Mulai Ujian"), style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            )
          ],
        ),
      ),
    ),
  ),
);
}
}
