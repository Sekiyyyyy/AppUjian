import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import '../controllers/exam_controller.dart';
import '../../../theme/app_theme.dart';
import '../../../routes/app_pages.dart';
import '../../../utils/app_toast.dart';

class ExamView extends GetView<ExamController> {
  const ExamView({super.key});

  void _showQuestionGrid(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 580),
          child: Container(
            height: MediaQuery.of(context).size.height * 0.7,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Navigasi Soal", style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary)),
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.grey.shade100, shape: BoxShape.circle),
                    child: const Icon(Icons.close_rounded, size: 20),
                  ),
                  onPressed: () => Get.back()
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildLegend(AppTheme.primaryColor, "Terjawab"),
                _buildLegend(Colors.amber.shade500, "Ragu-ragu"),
                _buildLegend(Colors.grey.shade200, "Belum", textColor: Colors.grey.shade600),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: Obx(() => GridView.builder(
                physics: const BouncingScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 5,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: controller.questions.length,
                itemBuilder: (context, index) {
                  final qId = controller.questions[index]['id'];
                  final isAnswered = controller.answers.containsKey(qId);
                  final isFlagged = controller.flagged[qId] ?? false;
                  final isCurrent = controller.currentIndex.value == index;

                  Color bgColor = Colors.grey.shade100;
                  Color textColor = AppTheme.textPrimary;
                  
                  if (isFlagged) {
                    bgColor = Colors.amber.shade500;
                    textColor = Colors.white;
                  } else if (isAnswered) {
                    bgColor = AppTheme.primaryColor;
                    textColor = Colors.white;
                  }

                  return InkWell(
                    onTap: () {
                      controller.jumpToQuestion(index);
                      Get.back(); // close bottom sheet
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeOutCubic,
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(16),
                        border: isCurrent ? Border.all(color: AppTheme.secondaryColor, width: 3) : null,
                        boxShadow: isCurrent 
                          ? [BoxShadow(color: AppTheme.secondaryColor.withValues(alpha: 0.4), blurRadius: 12, spreadRadius: 2)]
                          : (isAnswered || isFlagged ? [BoxShadow(color: bgColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 4))] : []),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        "${index + 1}",
                        style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16, color: textColor),
                      ),
                    ),
                  );
                },
              )),
            ),
          ],
        ),
      ),
    ),
  ),
);
}

  Widget _buildLegend(Color color, String label, {Color? textColor}) {
    return Row(
      children: [
        Container(
          width: 16, 
          height: 16, 
          decoration: BoxDecoration(
            color: color, 
            borderRadius: BorderRadius.circular(6),
            boxShadow: [BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 4, offset: const Offset(0, 2))],
          )
        ),
        const SizedBox(width: 8),
        Text(label, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: textColor ?? AppTheme.textSecondary)),
      ],
    );
  }

  void _showExamInfoSheet(BuildContext context, Map<String, dynamic> exam) {
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
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Center(
              child: Text(
                "Informasi Ujian",
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textPrimary, letterSpacing: -0.5),
              ),
            ),
            const SizedBox(height: 32),
            _buildInfoRow(Icons.verified_user_outlined, "Proktor Utama", exam['proktor'] ?? '-'),
            _buildInfoRow(Icons.people_outline_rounded, "Pengawas Ruang", exam['pengawas'] ?? '-'),
            _buildInfoRow(Icons.school_outlined, "Tahun / Semester", "${exam['tahun'] ?? '-'} / ${exam['semester'] ?? '-'}"),
            _buildInfoRow(Icons.timer_outlined, "Lama Ujian", "${exam['duration']} Menit"),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  elevation: 8,
                  shadowColor: AppTheme.primaryColor.withValues(alpha: 0.5),
                ),
                onPressed: () => Get.back(),
                child: Text("Tutup", style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
      ),
    ),
  ),
);
}

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppTheme.primaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 2),
                Text(label, style: GoogleFonts.inter(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 2),
                Text(
                  value.isNotEmpty ? value : '-', 
                  style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.right,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionHeader(int currentIndex, int qId) {
    return Obx(() {
      final isFlagged = controller.flagged[qId] ?? false;
      return Container(
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text("${currentIndex + 1}", style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  "Pertanyaan No. ${currentIndex + 1}",
                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                ),
              ],
            ),
            InkWell(
              onTap: controller.toggleFlag,
              borderRadius: BorderRadius.circular(16),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: isFlagged ? Colors.amber.shade500 : Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isFlagged ? Colors.amber.shade600 : Colors.amber.shade200),
                  boxShadow: isFlagged ? [BoxShadow(color: Colors.amber.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))] : [],
                ),
                child: Row(
                  children: [
                    Icon(
                      isFlagged ? Icons.flag_rounded : Icons.outlined_flag_rounded,
                      size: 16,
                      color: isFlagged ? Colors.white : Colors.amber.shade800,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      isFlagged ? "Ragu (Aktif)" : "Ragu-ragu",
                      style: GoogleFonts.inter(
                        color: isFlagged ? Colors.white : Colors.amber.shade800,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      );
    });
  }

  Widget _buildQuestionBody(dynamic currentQuestion) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: HtmlWidget(
        currentQuestion['content'] ?? '',
        textStyle: GoogleFonts.inter(
          fontSize: 16.0,
          color: AppTheme.textPrimary,
          height: 1.8,
        ),
        customStylesBuilder: (element) {
          if (element.localName == 'p') {
            return {'margin': '0', 'padding-bottom': '8px'};
          }
          if (element.localName == 'img') {
            return {'border-radius': '12px', 'margin-top': '12px', 'max-width': '100%'};
          }
          return null;
        },
      ),
    );
  }

  Widget _buildOptionsList(int qId, Map<String, dynamic>? options) {
    if (options == null || options.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4.0, bottom: 12),
          child: Text(
            "Pilih Salah Satu Jawaban:",
            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textSecondary, letterSpacing: 0.5),
          ),
        ),
        ...options.entries.map((entry) {
          final key = entry.key;
          final value = entry.value.toString();

          return Obx(() {
            final isSelected = controller.answers[qId] == key;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => controller.selectAnswer(key),
                borderRadius: BorderRadius.circular(18),
                splashColor: AppTheme.primaryColor.withValues(alpha: 0.08),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: isSelected ? AppTheme.primaryColor.withValues(alpha: 0.04) : Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected ? [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.12),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      )
                    ] : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.01),
                        blurRadius: 4,
                        offset: const Offset(0, 1),
                      )
                    ],
                  ),
                  child: Row(
                    children: [
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 40,
                        height: 40,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: isSelected ? const LinearGradient(
                            colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                          ) : null,
                          color: isSelected ? null : Colors.grey.shade100,
                          shape: BoxShape.circle,
                          border: isSelected ? null : Border.all(color: Colors.grey.shade300, width: 1.5),
                        ),
                        child: isSelected
                          ? const Icon(Icons.check_rounded, color: Colors.white, size: 20)
                          : Text(
                              key,
                              style: GoogleFonts.inter(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: HtmlWidget(
                          value,
                          textStyle: GoogleFonts.inter(
                            fontSize: 15.0,
                            color: AppTheme.textPrimary,
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                            height: 1.5,
                          ),
                          customStylesBuilder: (element) {
                            if (element.localName == 'p') return {'margin': '0'};
                            return null;
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          });
        }),
      ],
    );
  }

  Widget _buildDesktopSidebar(BuildContext context) {
    return Container(
      width: 320,
      margin: const EdgeInsets.fromLTRB(0, 24, 28, 32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sidebar Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.grid_view_rounded, color: AppTheme.primaryColor, size: 18),
              ),
              const SizedBox(width: 10),
              Text(
                "Navigasi Soal",
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Legend / Stats
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildLegend(AppTheme.primaryColor, "Terjawab"),
                    Obx(() => Text(
                      "${controller.answers.length}",
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: AppTheme.primaryColor),
                    )),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildLegend(Colors.amber.shade500, "Ragu-ragu"),
                    Obx(() => Text(
                      "${controller.flagged.values.where((v) => v).length}",
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.amber.shade700),
                    )),
                  ],
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildLegend(Colors.grey.shade300, "Belum", textColor: Colors.grey.shade600),
                    Obx(() => Text(
                      "${controller.questions.length - controller.answers.length}",
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.grey.shade600),
                    )),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Questions Grid
          Expanded(
            child: Obx(() => GridView.builder(
              physics: const BouncingScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: controller.questions.length,
              itemBuilder: (context, index) {
                final qId = controller.questions[index]['id'];
                final isAnswered = controller.answers.containsKey(qId);
                final isFlagged = controller.flagged[qId] ?? false;
                final isCurrent = controller.currentIndex.value == index;

                Color bgColor = Colors.grey.shade100;
                Color textColor = AppTheme.textPrimary;

                if (isFlagged) {
                  bgColor = Colors.amber.shade500;
                  textColor = Colors.white;
                } else if (isAnswered) {
                  bgColor = AppTheme.primaryColor;
                  textColor = Colors.white;
                }

                return InkWell(
                  onTap: () => controller.jumpToQuestion(index),
                  borderRadius: BorderRadius.circular(12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    decoration: BoxDecoration(
                      color: bgColor,
                      borderRadius: BorderRadius.circular(12),
                      border: isCurrent
                        ? Border.all(color: AppTheme.secondaryColor, width: 2.5)
                        : Border.all(color: Colors.transparent),
                      boxShadow: isCurrent
                        ? [BoxShadow(color: AppTheme.secondaryColor.withValues(alpha: 0.4), blurRadius: 8, spreadRadius: 1)]
                        : [],
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      "${index + 1}",
                      style: GoogleFonts.inter(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: textColor,
                      ),
                    ),
                  ),
                );
              },
            )),
          ),
          const SizedBox(height: 16),

          // Selesai Ujian Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: controller.finishExamPrompt,
              icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
              label: Text("SELESAI UJIAN", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green.shade600,
                foregroundColor: Colors.white,
                elevation: 4,
                shadowColor: Colors.green.withValues(alpha: 0.3),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppToast.warning(
          title: "Aksi Ditolak",
          message: "Gunakan tombol SELESAI UJIAN untuk keluar.",
        );
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        extendBody: true, // Allow body to flow behind bottom nav
        appBar: AppBar(
          automaticallyImplyLeading: false, // hide back button
          backgroundColor: Colors.white.withValues(alpha: 0.9),
          flexibleSpace: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(color: Colors.transparent),
            ),
          ),
          elevation: 0,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(4.0),
            child: Obx(() {
              if (controller.questions.isEmpty) return const SizedBox.shrink();
              final progress = (controller.currentIndex.value + 1) / controller.questions.length;
              return LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.grey.shade200,
                valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primaryColor),
                minHeight: 4,
              );
            }),
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                controller.examTitle, 
                style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: -0.5),
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                "CBT SMK Negeri 1 Beringin", 
                style: GoogleFonts.inter(color: AppTheme.primaryColor, fontSize: 12, fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
          actions: [
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.info_outline_rounded, color: AppTheme.textSecondary),
                    onPressed: () {
                      if (controller.examData != null) {
                        _showExamInfoSheet(context, controller.examData!);
                      }
                    },
                  ),
                  Obx(() {
                    if (controller.violationCount.value == 0) return const SizedBox.shrink();
                    return Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.red.shade600,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(color: Colors.red.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 2))
                        ]
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.warning_rounded, color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            "${controller.violationCount.value}/3",
                            style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          )
                        ],
                      ),
                    );
                  }),
                  Container(
                    margin: const EdgeInsets.only(right: 16, top: 8, bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))
                      ]
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer_rounded, color: Colors.white, size: 16),
                        const SizedBox(width: 6),
                        Obx(() {
                          bool isCritical = controller.timeRemaining.value > 0 && controller.timeRemaining.value < 300; // < 5 mins
                          return Text(
                            controller.formattedTime,
                            style: GoogleFonts.inter(
                              color: isCritical ? Colors.red.shade100 : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                          );
                        }),
                      ],
                    ),
                  )
                ],
              ),
            )
          ],
        ),
        body: Stack(
          children: [
            // Decorative Glowing Background
            Positioned(
              top: -100,
              right: -100,
              child: Container(
                width: 300,
                height: 300,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),
            
            Obx(() {
              if (controller.isLoading.value) {
                return const Center(child: CircularProgressIndicator(color: AppTheme.primaryColor));
              }
              if (controller.errorMessage.isNotEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline_rounded, color: Colors.red.shade400, size: 64),
                      const SizedBox(height: 16),
                      Text(controller.errorMessage.value, style: GoogleFonts.inter(color: Colors.red.shade600, fontSize: 16, fontWeight: FontWeight.w500)),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => Get.offAllNamed(Routes.MAIN),
                        icon: const Icon(Icons.home_rounded),
                        label: const Text("Kembali ke Beranda"),
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white),
                      )
                    ],
                  )
                );
              }
              if (controller.questions.isEmpty) {
                return const Center(child: Text("Soal belum tersedia untuk ujian ini."));
              }

              final currentIndex = controller.currentIndex.value;
              final currentQuestion = controller.questions[currentIndex];
              final rawId = currentQuestion['id'];
              final qId = rawId is int ? rawId : int.parse(rawId.toString());
              final options = currentQuestion['options'] as Map<String, dynamic>?;
              final isDesktop = MediaQuery.of(context).size.width >= 900;

              if (isDesktop) {
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Main Question Area
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(28, 24, 20, 32),
                        child: Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 860),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _buildQuestionHeader(currentIndex, qId),
                                _buildQuestionBody(currentQuestion),
                                const SizedBox(height: 24),
                                _buildOptionsList(qId, options),
                                const SizedBox(height: 32),
                                // Desktop Navigation Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    OutlinedButton.icon(
                                      onPressed: currentIndex > 0 ? controller.previousQuestion : null,
                                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                                      label: Text("SOAL SEBELUMNYA", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: AppTheme.primaryColor,
                                        side: BorderSide(color: currentIndex > 0 ? AppTheme.primaryColor.withValues(alpha: 0.3) : Colors.grey.shade200, width: 1.5),
                                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                        backgroundColor: Colors.white,
                                      ),
                                    ),
                                    if (currentIndex < controller.questions.length - 1)
                                      ElevatedButton.icon(
                                        onPressed: controller.nextQuestion,
                                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                                        label: Text("SOAL BERIKUTNYA", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppTheme.primaryColor,
                                          foregroundColor: Colors.white,
                                          elevation: 4,
                                          shadowColor: AppTheme.primaryColor.withValues(alpha: 0.3),
                                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                        ),
                                      )
                                    else
                                      ElevatedButton.icon(
                                        onPressed: controller.finishExamPrompt,
                                        icon: const Icon(Icons.check_circle_rounded, size: 18),
                                        label: Text("SELESAI UJIAN", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: Colors.green.shade600,
                                          foregroundColor: Colors.white,
                                          elevation: 4,
                                          shadowColor: Colors.green.withValues(alpha: 0.3),
                                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),

                    // Desktop Sidebar (Navigasi Soal)
                    _buildDesktopSidebar(context),
                  ],
                );
              }

              return Column(
                children: [
                  // Question Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 120), // Extra padding at bottom for floating nav
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 860),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildQuestionHeader(currentIndex, qId),
                              _buildQuestionBody(currentQuestion),
                              const SizedBox(height: 24),
                              _buildOptionsList(qId, options),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),

            // Floating Bottom Navigation (Mobile only)
            Obx(() {
              if (controller.isLoading.value || controller.questions.isEmpty || controller.errorMessage.isNotEmpty) {
                return const SizedBox.shrink();
              }
              final isDesktop = MediaQuery.of(context).size.width >= 900;
              if (isDesktop) return const SizedBox.shrink();

              final currentIndex = controller.currentIndex.value;
              final bottomPadding = MediaQuery.of(context).padding.bottom;
              return Positioned(
                bottom: bottomPadding > 0 ? bottomPadding + 8 : 16,
                left: 16,
                right: 16,
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 680),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 1.5),
                            boxShadow: [
                              BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, 10))
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              // Prev Button
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: currentIndex > 0 ? controller.previousQuestion : null,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppTheme.primaryColor,
                                    side: BorderSide(color: currentIndex > 0 ? AppTheme.primaryColor.withValues(alpha: 0.3) : Colors.grey.shade200, width: 1.5),
                                    padding: const EdgeInsets.symmetric(vertical: 16),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    backgroundColor: Colors.white.withValues(alpha: 0.5),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.arrow_back_rounded, size: 18),
                                      const SizedBox(width: 8),
                                      Text("KEMBALI", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              
                              // Grid Button
                              InkWell(
                                onTap: () => _showQuestionGrid(context),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: const Icon(Icons.grid_view_rounded, color: AppTheme.primaryColor, size: 24),
                                ),
                              ),
                              const SizedBox(width: 12),
                              
                              // Next / Finish Button
                              Expanded(
                                child: currentIndex < controller.questions.length - 1 
                                ? ElevatedButton(
                                    onPressed: controller.nextQuestion,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryColor,
                                      foregroundColor: Colors.white,
                                      elevation: 8,
                                      shadowColor: AppTheme.primaryColor.withValues(alpha: 0.4),
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text("LANJUT", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                        const SizedBox(width: 8),
                                        const Icon(Icons.arrow_forward_rounded, size: 18),
                                      ],
                                    ),
                                  )
                                : ElevatedButton(
                                    onPressed: controller.finishExamPrompt,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green.shade500,
                                      foregroundColor: Colors.white,
                                      elevation: 8,
                                      shadowColor: Colors.green.withValues(alpha: 0.4),
                                      padding: const EdgeInsets.symmetric(vertical: 16),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.check_circle_rounded, size: 20),
                                        const SizedBox(width: 8),
                                        Text("SELESAI", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                      ],
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
              );
            }),
          ],
        ),
      ),
    );
  }
}
