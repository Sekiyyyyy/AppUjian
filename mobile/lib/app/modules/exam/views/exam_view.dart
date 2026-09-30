import 'dart:io' show Platform;
import 'dart:ui';
import 'package:flutter/foundation.dart' show kIsWeb;
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
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktopPlatform = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
    final isDesktopOrWide = isDesktopPlatform || screenWidth >= 650;

    Widget buildGridContent({required BuildContext gridContext, required bool isDesktop}) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isDesktop) ...[
            Center(
              child: Container(
                width: 44,
                height: 5,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ],
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
                onPressed: () => Navigator.of(gridContext).pop(),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            alignment: WrapAlignment.spaceEvenly,
            spacing: 12,
            runSpacing: 8,
            children: [
              _buildLegend(AppTheme.primaryColor, "Terjawab"),
              _buildLegend(Colors.amber.shade500, "Ragu-ragu"),
              _buildLegend(Colors.grey.shade200, "Belum", textColor: Colors.grey.shade600),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: Obx(() => GridView.builder(
              physics: const BouncingScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: MediaQuery.of(gridContext).size.width < 360 ? 4 : (isDesktop ? 6 : 5),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
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
                    Navigator.of(gridContext).pop();
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
      );
    }

    if (isDesktopOrWide) {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 540,
              maxHeight: MediaQuery.of(context).size.height * 0.75,
            ),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.14),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: buildGridContent(gridContext: dialogContext, isDesktop: true),
            ),
          ),
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        builder: (sheetContext) => Container(
          width: double.infinity,
          height: MediaQuery.of(sheetContext).size.height * 0.72,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          padding: EdgeInsets.fromLTRB(
            20, 
            14, 
            20, 
            16 + MediaQuery.of(sheetContext).padding.bottom
          ),
          child: buildGridContent(gridContext: sheetContext, isDesktop: false),
        ),
      );
    }
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
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktopPlatform = !kIsWeb && (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
    final isDesktopOrWide = isDesktopPlatform || screenWidth >= 650;

    Widget buildInfoContent({required BuildContext infoContext, required bool isDesktop}) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isDesktop) ...[
            Center(
              child: Container(
                width: 44,
                height: 5,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ],
          Center(
            child: Text(
              "Informasi Ujian",
              style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textPrimary, letterSpacing: -0.5),
            ),
          ),
          const SizedBox(height: 24),
          _buildInfoRow(Icons.verified_user_outlined, "Proktor Utama", exam['proktor'] ?? '-'),
          _buildInfoRow(Icons.people_outline_rounded, "Pengawas Ruang", exam['pengawas'] ?? '-'),
          _buildInfoRow(Icons.school_outlined, "Tahun / Semester", "${exam['tahun'] ?? '-'} / ${exam['semester'] ?? '-'}"),
          _buildInfoRow(Icons.timer_outlined, "Lama Ujian", "${exam['duration']} Menit"),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 4,
                shadowColor: AppTheme.primaryColor.withValues(alpha: 0.4),
              ),
              onPressed: () => Navigator.of(infoContext).pop(),
              child: Text("Tutup", style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          )
        ],
      );
    }

    if (isDesktopOrWide) {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (dialogContext) => Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 500),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.14),
                    blurRadius: 28,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: buildInfoContent(infoContext: dialogContext, isDesktop: true),
              ),
            ),
          ),
        ),
      );
    } else {
      showModalBottomSheet(
        context: context,
        backgroundColor: Colors.transparent,
        isScrollControlled: true,
        builder: (sheetContext) => Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 24,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          padding: EdgeInsets.fromLTRB(
            24, 
            16, 
            24, 
            24 + MediaQuery.of(sheetContext).padding.bottom
          ),
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: buildInfoContent(infoContext: sheetContext, isDesktop: false),
          ),
        ),
      );
    }
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
            Expanded(
              child: Row(
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
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      "Pertanyaan No. ${currentIndex + 1}",
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
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
    final screenWidth = MediaQuery.of(context).size.width;
    final sidebarWidth = screenWidth < 1200 ? 280.0 : 320.0;
    final gridCount = screenWidth < 1200 ? 4 : 5;

    return Container(
      width: sidebarWidth,
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
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: gridCount,
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

  Widget _buildDesktopBottomNav(int currentIndex, int qId) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = MediaQuery.of(context).size.width;
        final isCompact = constraints.maxWidth < 620 || screenWidth < 1100;

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: Colors.grey.shade200, width: 1.5),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 12,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          padding: EdgeInsets.symmetric(
            horizontal: isCompact ? 16 : 28,
            vertical: 14,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 860),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Tombol Soal Sebelumnya
                  OutlinedButton.icon(
                    onPressed: currentIndex > 0 ? controller.previousQuestion : null,
                    icon: const Icon(Icons.arrow_back_rounded, size: 18),
                    label: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        isCompact ? "SEBELUMNYA" : "SOAL SEBELUMNYA",
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: BorderSide(
                        color: currentIndex > 0
                            ? AppTheme.primaryColor.withValues(alpha: 0.3)
                            : Colors.grey.shade200,
                        width: 1.5,
                      ),
                      padding: EdgeInsets.symmetric(
                        horizontal: isCompact ? 14 : 22,
                        vertical: 15,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      backgroundColor: Colors.white,
                    ),
                  ),

                  // Tombol Ragu-ragu (Tengah)
                  Obx(() {
                    final isFlagged = controller.flagged[qId] ?? false;
                    return InkWell(
                      onTap: controller.toggleFlag,
                      borderRadius: BorderRadius.circular(14),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: EdgeInsets.symmetric(
                          horizontal: isCompact ? 12 : 18,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: isFlagged ? Colors.amber.shade500 : Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isFlagged ? Colors.amber.shade600 : Colors.amber.shade300,
                            width: 1.5,
                          ),
                          boxShadow: isFlagged
                              ? [
                                  BoxShadow(
                                    color: Colors.amber.withValues(alpha: 0.3),
                                    blurRadius: 8,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : [],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              isFlagged ? Icons.check_box_rounded : Icons.check_box_outline_blank_rounded,
                              size: 18,
                              color: isFlagged ? Colors.white : Colors.amber.shade900,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "RAGU-RAGU",
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isFlagged ? Colors.white : Colors.amber.shade900,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),

                  // Tombol Soal Berikutnya / Selesai Ujian
                  if (currentIndex < controller.questions.length - 1)
                    ElevatedButton.icon(
                      onPressed: controller.nextQuestion,
                      icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          isCompact ? "BERIKUTNYA" : "SOAL BERIKUTNYA",
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        elevation: 3,
                        shadowColor: AppTheme.primaryColor.withValues(alpha: 0.3),
                        padding: EdgeInsets.symmetric(
                          horizontal: isCompact ? 14 : 22,
                          vertical: 15,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    )
                  else
                    ElevatedButton.icon(
                      onPressed: controller.finishExamPrompt,
                      icon: const Icon(Icons.check_circle_rounded, size: 18),
                      label: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: Text(
                          "SELESAI UJIAN",
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade600,
                        foregroundColor: Colors.white,
                        elevation: 3,
                        shadowColor: Colors.green.withValues(alpha: 0.3),
                        padding: EdgeInsets.symmetric(
                          horizontal: isCompact ? 14 : 22,
                          vertical: 15,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                ],
              ),
            ),
          ),
        );
      },
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
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                controller.examTitle, 
                style: GoogleFonts.inter(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: -0.5),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                "CBT SMK Negeri 1 Beringin", 
                style: GoogleFonts.inter(color: AppTheme.primaryColor, fontSize: 11, fontWeight: FontWeight.w600),
                maxLines: 1,
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
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.red.shade600,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(color: Colors.red.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 2))
                        ]
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.warning_rounded, color: Colors.white, size: 13),
                          const SizedBox(width: 3),
                          Text(
                            "${controller.violationCount.value}/3",
                            style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          )
                        ],
                      ),
                    );
                  }),
                  Container(
                    margin: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(color: AppTheme.primaryColor.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))
                      ]
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.timer_rounded, color: Colors.white, size: 15),
                        const SizedBox(width: 5),
                        Obx(() {
                          bool isCritical = controller.timeRemaining.value > 0 && controller.timeRemaining.value < 300; // < 5 mins
                          return Text(
                            controller.formattedTime,
                            style: GoogleFonts.inter(
                              color: isCritical ? Colors.red.shade100 : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
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
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const CircularProgressIndicator(color: AppTheme.primaryColor),
                        const SizedBox(height: 20),
                        Text(
                          "Menyiapkan Mode Ujian Aman...",
                          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textPrimary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          "Silakan setujui perizinan sematkan aplikasi (tekan Mengerti) jika muncul di layar.",
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(fontSize: 12, color: AppTheme.textSecondary, height: 1.4),
                        ),
                        const SizedBox(height: 20),
                        OutlinedButton.icon(
                          onPressed: () => controller.cancelAndExitToMain(),
                          icon: const Icon(Icons.arrow_back_rounded, size: 16),
                          label: const Text("Batalkan & Kembali ke Beranda"),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.grey.shade700,
                            side: BorderSide(color: Colors.grey.shade300),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
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
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Main Question Area with Fixed Bottom Navigation
                    Expanded(
                      child: Column(
                        children: [
                          // Scrollable Question Content
                          Expanded(
                            child: SingleChildScrollView(
                              physics: const BouncingScrollPhysics(),
                              padding: const EdgeInsets.fromLTRB(28, 24, 28, 32),
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
                                      const SizedBox(height: 16),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),

                          // Fixed Bottom Navigation Bar for Desktop
                          _buildDesktopBottomNav(currentIndex, qId),
                        ],
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
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.6), width: 1.5),
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
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    backgroundColor: Colors.white.withValues(alpha: 0.5),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.arrow_back_rounded, size: 16),
                                      const SizedBox(width: 6),
                                      FittedBox(
                                        fit: BoxFit.scaleDown,
                                        child: Text("KEMBALI", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5)),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Quick Flag Doubt Button for Mobile
                              InkWell(
                                onTap: controller.toggleFlag,
                                borderRadius: BorderRadius.circular(14),
                                child: Obx(() {
                                  final rawId = controller.questions[currentIndex]['id'];
                                  final currentQId = rawId is int ? rawId : int.parse(rawId.toString());
                                  final isFlagged = controller.flagged[currentQId] ?? false;
                                  return AnimatedContainer(
                                    duration: const Duration(milliseconds: 200),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: isFlagged ? Colors.amber.shade500 : Colors.amber.shade50,
                                      borderRadius: BorderRadius.circular(14),
                                      border: Border.all(color: isFlagged ? Colors.amber.shade600 : Colors.amber.shade200),
                                    ),
                                    child: Icon(
                                      isFlagged ? Icons.flag_rounded : Icons.outlined_flag_rounded,
                                      color: isFlagged ? Colors.white : Colors.amber.shade800,
                                      size: 20,
                                    ),
                                  );
                                }),
                              ),
                              const SizedBox(width: 8),

                              // Grid Button
                              InkWell(
                                onTap: () => _showQuestionGrid(context),
                                borderRadius: BorderRadius.circular(14),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: const Icon(Icons.grid_view_rounded, color: AppTheme.primaryColor, size: 20),
                                ),
                              ),
                              const SizedBox(width: 8),

                              // Next / Finish Button
                              Expanded(
                                child: currentIndex < controller.questions.length - 1 
                                ? ElevatedButton(
                                    onPressed: controller.nextQuestion,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppTheme.primaryColor,
                                      foregroundColor: Colors.white,
                                      elevation: 6,
                                      shadowColor: AppTheme.primaryColor.withValues(alpha: 0.4),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text("LANJUT", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5)),
                                        ),
                                        const SizedBox(width: 6),
                                        const Icon(Icons.arrow_forward_rounded, size: 16),
                                      ],
                                    ),
                                  )
                                : ElevatedButton(
                                    onPressed: controller.finishExamPrompt,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Colors.green.shade500,
                                      foregroundColor: Colors.white,
                                      elevation: 6,
                                      shadowColor: Colors.green.withValues(alpha: 0.4),
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    ),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.check_circle_rounded, size: 18),
                                        const SizedBox(width: 6),
                                        FittedBox(
                                          fit: BoxFit.scaleDown,
                                          child: Text("SELESAI", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5)),
                                        ),
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

            // Fullscreen Paused Overlay
            Obx(() {
              if (!controller.isExamPaused.value) return const SizedBox.shrink();
              return Positioned.fill(
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.65),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                    alignment: Alignment.center,
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 460),
                      child: Container(
                        padding: const EdgeInsets.all(28),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 32,
                              offset: Offset(0, 12),
                            )
                          ],
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 72,
                              height: 72,
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.orange.shade200, width: 2),
                              ),
                              child: Center(
                                child: Icon(
                                  Icons.pause_circle_filled_rounded,
                                  size: 44,
                                  color: Colors.orange.shade700,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              "Ujian Diberhentikan Sementara",
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppTheme.textPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.orange.shade50,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: Colors.orange.shade200),
                              ),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.info_outline_rounded, size: 18, color: Colors.orange.shade800),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      controller.pauseReason.value.isNotEmpty
                                          ? controller.pauseReason.value
                                          : "Ujian diberhentikan sementara oleh pengawas karena suasana ruangan berisik.",
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Colors.orange.shade900,
                                        height: 1.4,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              "Harap tetap tertib dan tenang di meja Anda. Waktu ujian dihentikan sementara dan seluruh jawaban Anda tersimpan aman. Layar ujian akan otomatis kembali saat pengawas melanjutkan sesi ujian.",
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                                height: 1.5,
                              ),
                            ),
                            const SizedBox(height: 22),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(Colors.orange.shade700),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  "Menunggu pengawas melanjutkan ujian...",
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.orange.shade800,
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
              );
            }),
          ],
        ),
      ),
    );
  }
}
