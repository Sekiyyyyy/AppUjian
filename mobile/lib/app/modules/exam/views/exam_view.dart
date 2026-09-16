import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import '../controllers/exam_controller.dart';

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
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Navigasi Soal", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.deepPurple)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Get.back()),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildLegend(Colors.green.shade500, "Terjawab"),
                _buildLegend(Colors.amber.shade500, "Ragu-ragu"),
                _buildLegend(Colors.grey.shade300, "Belum"),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: Obx(() => GridView.builder(
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

                  Color bgColor = Colors.grey.shade200;
                  Color textColor = Colors.black87;
                  
                  if (isFlagged) {
                    bgColor = Colors.amber.shade500;
                    textColor = Colors.white;
                  } else if (isAnswered) {
                    bgColor = Colors.green.shade500;
                    textColor = Colors.white;
                  }

                  return InkWell(
                    onTap: () {
                      controller.jumpToQuestion(index);
                      Get.back(); // close bottom sheet
                    },
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: isCurrent ? Border.all(color: Colors.deepPurple, width: 3) : null,
                        boxShadow: [
                          if (isCurrent)
                            BoxShadow(color: Colors.deepPurple.withOpacity(0.3), blurRadius: 8, spreadRadius: 2)
                        ]
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        "${index + 1}",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: textColor),
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

  Widget _buildLegend(Color color, String label) {
    return Row(
      children: [
        Container(width: 16, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black54)),
      ],
    );
  }

  void _showExamInfoSheet(BuildContext context, Map<String, dynamic> exam) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
            const Text(
              "Informasi Ujian",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(Icons.verified_user_outlined, "Proktor Utama", exam['proktor'] ?? '-'),
            _buildInfoRow(Icons.people_outline_rounded, "Pengawas Ruang", exam['pengawas'] ?? '-'),
            _buildInfoRow(Icons.school_outlined, "Tahun / Semester", "${exam['tahun'] ?? '-'} / ${exam['semester'] ?? '-'}"),
            _buildInfoRow(Icons.timer_outlined, "Lama Ujian", "${exam['duration']} Menit"),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
                onPressed: () => Get.back(),
                child: const Text("Tutup", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey.shade500),
          const SizedBox(width: 12),
          Expanded(
            flex: 2,
            child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value.isNotEmpty ? value : '-', 
              style: const TextStyle(color: Colors.black87, fontSize: 13, fontWeight: FontWeight.w600),
              textAlign: TextAlign.right,
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
        // Prevent accidental back button
        Get.snackbar("Aksi Ditolak", "Gunakan tombol SELESAI UJIAN untuk keluar", backgroundColor: Colors.red, colorText: Colors.white);
        return false;
      },
      child: Scaffold(
        backgroundColor: Colors.grey.shade50,
        appBar: AppBar(
          automaticallyImplyLeading: false, // hide back button
          backgroundColor: Colors.white,
          elevation: 1,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(controller.examTitle, style: const TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.bold)),
              const Text("CBT SMK Negeri 1 Beringin", style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.info_outline, color: Colors.deepPurple),
              onPressed: () {
                if (controller.examData != null) {
                  _showExamInfoSheet(context, controller.examData!);
                }
              },
            ),
            Container(
              margin: const EdgeInsets.only(right: 16, top: 10, bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.deepPurple.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.deepPurple.shade200)
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer, color: Colors.deepPurple, size: 18),
                  const SizedBox(width: 6),
                  Obx(() {
                    bool isCritical = controller.timeRemaining.value > 0 && controller.timeRemaining.value < 300; // < 5 mins
                    return Text(
                      controller.formattedTime,
                      style: TextStyle(
                        color: isCritical ? Colors.red : Colors.deepPurple,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    );
                  }),
                ],
              ),
            )
          ],
        ),
        body: Obx(() {
          if (controller.isLoading.value) {
            return const Center(child: CircularProgressIndicator(color: Colors.deepPurple));
          }
          if (controller.errorMessage.isNotEmpty) {
            return Center(child: Text(controller.errorMessage.value, style: const TextStyle(color: Colors.red, fontSize: 16)));
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
              // Question Header (Number & Flag)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                color: Colors.white,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "Soal No. ${currentIndex + 1}",
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.deepPurple),
                    ),
                    InkWell(
                      onTap: controller.toggleFlag,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: (controller.flagged[qId] ?? false) ? Colors.amber.shade100 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: (controller.flagged[qId] ?? false) ? Colors.amber : Colors.grey.shade300)
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.flag, size: 16, color: (controller.flagged[qId] ?? false) ? Colors.amber.shade800 : Colors.grey.shade600),
                            const SizedBox(width: 4),
                            Text("Ragu-ragu", style: TextStyle(color: (controller.flagged[qId] ?? false) ? Colors.amber.shade800 : Colors.grey.shade600, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    )
                  ],
                ),
              ),

              // Question Content
              Expanded(
                child: SingleChildScrollView(
                  physics: const BouncingScrollPhysics(),
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      HtmlWidget(
                        currentQuestion['content'] ?? '',
                        textStyle: const TextStyle(
                          fontSize: 16.0,
                          color: Colors.black87,
                          height: 1.6,
                        ),
                        customStylesBuilder: (element) {
                          if (element.localName == 'p') {
                            return {'margin': '0'};
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 32),
                      
                      // Options
                      if (options != null)
                        ...options.entries.map((entry) {
                          String key = entry.key; // A, B, C, D
                          String value = entry.value.toString();
                          bool isSelected = controller.answers[qId] == key;

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: InkWell(
                              onTap: () => controller.selectAnswer(key),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: isSelected ? Colors.deepPurple.withOpacity(0.08) : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected ? Colors.deepPurple : Colors.grey.shade300,
                                    width: isSelected ? 2 : 1
                                  ),
                                  boxShadow: isSelected ? [BoxShadow(color: Colors.deepPurple.withOpacity(0.1), blurRadius: 8, spreadRadius: 0)] : []
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 40,
                                      height: 40,
                                      alignment: Alignment.center,
                                        decoration: BoxDecoration(
                                          color: isSelected ? Colors.deepPurple : Colors.grey.shade100,
                                          shape: BoxShape.circle,
                                          boxShadow: isSelected ? [BoxShadow(color: Colors.deepPurple.withOpacity(0.3), blurRadius: 4, offset: const Offset(0,2))] : []
                                        ),
                                        child: isSelected 
                                          ? const Icon(Icons.check, color: Colors.white, size: 20)
                                          : Text(
                                              key,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 18,
                                                color: Colors.black54,
                                              ),
                                            ),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: HtmlWidget(
                                        value,
                                        textStyle: TextStyle(
                                          fontSize: 15.0,
                                          color: isSelected ? Colors.deepPurple.shade900 : Colors.black87,
                                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
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

              // Bottom Navigation
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))]
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Prev Button
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: currentIndex > 0 ? controller.previousQuestion : null,
                        icon: const Icon(Icons.arrow_back_ios, size: 14),
                        label: const Text("SEBELUMNYA", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.deepPurple,
                          side: BorderSide(color: currentIndex > 0 ? Colors.deepPurple : Colors.grey.shade300, width: 2),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    // Grid Button
                    InkWell(
                      onTap: () => _showQuestionGrid(context),
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: Colors.deepPurple.shade200, width: 2),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(Icons.grid_view, color: Colors.deepPurple, size: 20),
                      ),
                    ),
                    const SizedBox(width: 12),
                    
                    // Next / Finish Button
                    Expanded(
                      child: currentIndex < controller.questions.length - 1 
                      ? ElevatedButton(
                          onPressed: controller.nextQuestion,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.deepPurple,
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shadowColor: Colors.deepPurple.withOpacity(0.4),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text("SELANJUTNYA", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              SizedBox(width: 8),
                              Icon(Icons.arrow_forward_ios, size: 14),
                            ],
                          ),
                        )
                      : ElevatedButton(
                          onPressed: controller.finishExamPrompt,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            elevation: 4,
                            shadowColor: Colors.green.withOpacity(0.4),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.check_circle_outline, size: 18),
                              SizedBox(width: 8),
                              Text("SELESAI", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                        ),
                    ),
                  ],
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}
