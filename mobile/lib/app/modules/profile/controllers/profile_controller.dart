import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../data/api_client.dart';
import '../../../data/services/update_service.dart';

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

  void checkForUpdates() {
    UpdateService.checkForUpdate(isManualCheck: true);
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('username');
    await prefs.remove('name');
    await prefs.remove('nis');
    await prefs.remove('class_name');
    await prefs.remove('ongoing_exam_id');
    ApiClient().clearToken();

    // Delete all registered controllers to prevent stale state
    Get.deleteAll(force: true);

    Get.offAllNamed('/login');
  }
}
