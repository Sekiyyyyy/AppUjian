import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ProfileController extends GetxController {
  final studentName = ''.obs;
  final studentNis = ''.obs;

  @override
  void onInit() {
    super.onInit();
    loadProfile();
  }

  void loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    studentName.value = prefs.getString('name') ?? 'Siswa';
    studentNis.value = prefs.getString('nis') ?? '-';
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('username');
    await prefs.remove('name');
    await prefs.remove('nis');
    Get.offAllNamed('/login');
  }
}
