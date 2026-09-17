import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../data/api_client.dart';

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
    await prefs.clear();
    ApiClient().clearToken();

    // Delete all registered controllers to prevent stale state
    Get.deleteAll(force: true);

    Get.offAllNamed('/login');
  }
}
