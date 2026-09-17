import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import '../controllers/exam_controller.dart';
import '../../../theme/app_theme.dart';

class ExamView extends GetView<ExamController> {
  const ExamView({Key? key}) : super(key: key);

  void _showQuestionGrid(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
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
                          ? [BoxShadow(color: AppTheme.secondaryColor.withOpacity(0.4), blurRadius: 12, spreadRadius: 2)]
                          : (isAnswered || isFlagged ? [BoxShadow(color: bgColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 4))] : []),
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
            boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 4, offset: const Offset(0, 2))],
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
      builder: (context) => Container(
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
                  shadowColor: AppTheme.primaryColor.withOpacity(0.5),
                ),
                onPressed: () => Get.back(),
                child: Text("Tutup", style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            )
          ],
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
              color: AppTheme.primaryColor.withOpacity(0.1),
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

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        Get.snackbar("Aksi Ditolak", "Gunakan tombol SELESAI UJIAN untuk keluar", backgroundColor: Colors.red.shade600, colorText: Colors.white, margin: const EdgeInsets.all(16), borderRadius: 16);
        return false;
      },
      child: Scaffold(
        backgroundColor: AppTheme.backgroundColor,
        extendBody: true, // Allow body to flow behind bottom nav
        appBar: AppBar(
          automaticallyImplyLeading: false, // hide back button
          backgroundColor: Colors.white.withOpacity(0.9),
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
                        BoxShadow(color: AppTheme.primaryColor.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))
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
                  color: AppTheme.secondaryColor.withOpacity(0.1),
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
                        onPressed: () => Get.offAllNamed('/home'),
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
              final qId = currentQuestion['id'];
              final options = currentQuestion['options'] as Map<String, dynamic>?;

              return Column(
                children: [
                  // Question Content
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(24, 24, 24, 120), // Extra padding at bottom for floating nav
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Question Header (Number & Flag) Glassmorphic Card
                          Container(
                            margin: const EdgeInsets.only(bottom: 24),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: Colors.white, width: 2),
                              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))]
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        color: AppTheme.primaryColor.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: Center(
                                        child: Text("${currentIndex + 1}", style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                                      ),
                                    ),
                                    const SizedBox(width: 16),
                                    Text(
                                      "Pertanyaan",
                                      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textPrimary),
                                    ),
                                  ],
                                ),
                                InkWell(
                                  onTap: controller.toggleFlag,
                                  borderRadius: BorderRadius.circular(20),
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                    decoration: BoxDecoration(
                                      color: (controller.flagged[qId] ?? false) ? Colors.amber.shade500 : Colors.grey.shade100,
                                      borderRadius: BorderRadius.circular(20),
                                      boxShadow: (controller.flagged[qId] ?? false) ? [BoxShadow(color: Colors.amber.withOpacity(0.4), blurRadius: 8, offset: const Offset(0,2))] : []
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          (controller.flagged[qId] ?? false) ? Icons.flag_rounded : Icons.outlined_flag_rounded, 
                                          size: 18, 
                                          color: (controller.flagged[qId] ?? false) ? Colors.white : AppTheme.textSecondary
                                        ),
                                        const SizedBox(width: 6),
                                        Text("Ragu", style: GoogleFonts.inter(color: (controller.flagged[qId] ?? false) ? Colors.white : AppTheme.textSecondary, fontWeight: FontWeight.bold, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                )
                              ],
                            ),
                          ),

                          // Question Body
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 15, offset: const Offset(0, 5))],
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
                                  return {'border-radius': '12px', 'margin-top': '12px'};
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(height: 32),
                          
                          // Options Title
                          if (options != null && options.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(left: 8.0, bottom: 16),
                              child: Text("Pilih Salah Satu:", style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textSecondary)),
                            ),

                          // Options List
                          if (options != null)
                            ...options.entries.map((entry) {
                              String key = entry.key; // A, B, C, D
                              String value = entry.value.toString();
                              bool isSelected = controller.answers[qId] == key;

                              return Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: InkWell(
                                  onTap: () => controller.selectAnswer(key),
                                  borderRadius: BorderRadius.circular(20),
                                  splashColor: AppTheme.primaryColor.withOpacity(0.1),
                                  highlightColor: Colors.transparent,
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 250),
                                    curve: Curves.easeInOut,
                                    padding: const EdgeInsets.all(20),
                                    decoration: BoxDecoration(
                                      color: isSelected ? AppTheme.primaryColor.withOpacity(0.04) : Colors.white,
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: isSelected ? AppTheme.primaryColor : Colors.grey.shade200,
                                        width: isSelected ? 2 : 1
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: isSelected ? AppTheme.primaryColor.withOpacity(0.15) : Colors.black.withOpacity(0.02), 
                                          blurRadius: isSelected ? 12 : 8, 
                                          offset: const Offset(0, 4),
                                          spreadRadius: isSelected ? 2 : 0,
                                        )
                                      ]
                                    ),
                                    child: Row(
                                      children: [
                                        AnimatedContainer(
                                          duration: const Duration(milliseconds: 300),
                                          width: 44,
                                          height: 44,
                                          alignment: Alignment.center,
                                          decoration: BoxDecoration(
                                            gradient: isSelected ? const LinearGradient(
                                              colors: [AppTheme.primaryColor, AppTheme.secondaryColor],
                                              begin: Alignment.topLeft,
                                              end: Alignment.bottomRight,
                                            ) : null,
                                            color: isSelected ? null : Colors.grey.shade50,
                                            shape: BoxShape.circle,
                                            border: isSelected ? null : Border.all(color: Colors.grey.shade200, width: 2),
                                            boxShadow: isSelected ? [BoxShadow(color: AppTheme.primaryColor.withOpacity(0.4), blurRadius: 8, offset: const Offset(0,3))] : []
                                          ),
                                          child: AnimatedSwitcher(
                                            duration: const Duration(milliseconds: 200),
                                            transitionBuilder: (Widget child, Animation<double> animation) {
                                              return ScaleTransition(scale: animation, child: child);
                                            },
                                            child: isSelected 
                                              ? const Icon(Icons.check_rounded, color: Colors.white, size: 24, key: ValueKey('check'))
                                              : Text(
                                                  key,
                                                  key: const ValueKey('text'),
                                                  style: GoogleFonts.inter(
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 18,
                                                    color: AppTheme.textSecondary,
                                                  ),
                                                ),
                                          ),
                                        ),
                                        const SizedBox(width: 20),
                                        Expanded(
                                          child: HtmlWidget(
                                            value,
                                            textStyle: GoogleFonts.inter(
                                              fontSize: 15.0,
                                              color: isSelected ? AppTheme.textPrimary : AppTheme.textPrimary,
                                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                              height: 1.5,
                                            ),
                                            customStylesBuilder: (element) {
                                              if (element.localName == 'p') {
                                                return {'margin': '0'};
                                              }
                                              return null;
                                            },
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }),

            // Floating Bottom Navigation
            Obx(() {
              if (controller.isLoading.value || controller.questions.isEmpty || controller.errorMessage.isNotEmpty) {
                return const SizedBox.shrink();
              }
              final currentIndex = controller.currentIndex.value;
              return Positioned(
                bottom: 24,
                left: 24,
                right: 24,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.85),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.white.withOpacity(0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 20, offset: const Offset(0, 10))
                        ]
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
                                side: BorderSide(color: currentIndex > 0 ? AppTheme.primaryColor.withOpacity(0.3) : Colors.grey.shade200, width: 1.5),
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                backgroundColor: Colors.white.withOpacity(0.5),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.arrow_back_rounded, size: 18),
                                  const SizedBox(width: 8),
                                  Text("KEMBALI", style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5)),
                                ],
                              )
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
                                color: AppTheme.primaryColor.withOpacity(0.1),
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
                                  shadowColor: AppTheme.primaryColor.withOpacity(0.4),
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
                                  shadowColor: Colors.green.withOpacity(0.4),
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
              );
            }),
          ],
        ),
      ),
    );
  }
}
