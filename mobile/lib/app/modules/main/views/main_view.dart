import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/main_controller.dart';
import '../../home/views/home_view.dart';
import '../../home/views/history_view.dart';
import '../../profile/views/profile_view.dart';
import '../../../theme/app_theme.dart';

class MainView extends GetView<MainController> {
  const MainView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: Obx(() => IndexedStack(
        index: controller.currentIndex.value,
        children: const [
          HomeView(),
          HistoryView(),
          ProfileView(),
        ],
      )),
      bottomNavigationBar: Container(
        margin: const EdgeInsets.only(left: 24, right: 24, bottom: 24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(30),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.25),
                borderRadius: BorderRadius.circular(30),
                border: Border.all(
                  color: Colors.white.withOpacity(0.5),
                  width: 1.5,
                ),
              ),
              child: Obx(() => BottomNavigationBar(
                elevation: 0,
                backgroundColor: Colors.transparent,
                selectedItemColor: AppTheme.primaryColor,
                unselectedItemColor: Colors.grey.shade500,
                showSelectedLabels: true,
                showUnselectedLabels: false,
                currentIndex: controller.currentIndex.value,
                onTap: controller.changePage,
                type: BottomNavigationBarType.fixed,
                items: const [
                  BottomNavigationBarItem(
                    icon: Icon(Icons.home_rounded),
                    label: 'Beranda',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.history_rounded),
                    label: 'Riwayat',
                  ),
                  BottomNavigationBarItem(
                    icon: Icon(Icons.person_rounded),
                    label: 'Profil',
                  ),
                ],
              )),
            ),
          ),
        ),
      ),
    );
  }
}
