import 'package:get/get.dart';

import '../modules/login/views/login_view.dart';
import '../modules/login/bindings/login_binding.dart';
import '../modules/home/views/home_view.dart';
import '../modules/home/views/history_view.dart';
import '../modules/home/bindings/home_binding.dart';
import '../modules/exam/views/exam_view.dart';
import '../modules/exam/bindings/exam_binding.dart';

part 'app_routes.dart';

class AppPages {
  AppPages._();

  static const INITIAL = Routes.LOGIN;

  static final routes = [
    GetPage(
      name: _Paths.LOGIN,
      page: () => const LoginView(),
      binding: LoginBinding(),
    ),
    GetPage(
      name: _Paths.HOME,
      page: () => const HomeView(),
      binding: HomeBinding(),
    ),
    GetPage(
      name: _Paths.EXAM,
      page: () => const ExamView(),
      binding: ExamBinding(),
    ),
    GetPage(
      name: _Paths.HISTORY,
      page: () => const HistoryView(),
      binding: HomeBinding(),
    ),
  ];
}
