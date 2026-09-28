import 'package:get/get.dart';
import '../../../data/services/update_service.dart';

class MainController extends GetxController {
  final currentIndex = 0.obs;

  @override
  void onInit() {
    super.onInit();
    UpdateService.checkForUpdate();
  }

  void changePage(int index) {
    currentIndex.value = index;
  }
}
