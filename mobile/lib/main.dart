import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app/routes/app_pages.dart';
import 'app/theme/app_theme.dart';
import 'app/data/api_client.dart';
import 'app/data/services/update_service.dart';
import 'app/widgets/mandatory_update_widget.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);
  await ApiClient.init();

  // Auto-login: check if token exists & warm up ApiClient
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');
  if (token != null && token.isNotEmpty) {
    ApiClient().setToken(token);
  }
  final initialRoute = (token != null && token.isNotEmpty) ? Routes.MAIN : Routes.LOGIN;

  runApp(AppUjianRoot(initialRoute: initialRoute));
}

class AppUjianRoot extends StatefulWidget {
  final String initialRoute;
  const AppUjianRoot({super.key, required this.initialRoute});

  @override
  State<AppUjianRoot> createState() => _AppUjianRootState();
}

class _AppUjianRootState extends State<AppUjianRoot> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Langsung periksa pembaruan saat aplikasi dibuka
    WidgetsBinding.instance.addPostFrameCallback((_) {
      UpdateService.checkForUpdate();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Saat aplikasi dibuka kembali dari background, cek ulang pembaruan
    if (state == AppLifecycleState.resumed) {
      UpdateService.checkForUpdate();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: "App Ujian",
      initialRoute: widget.initialRoute,
      getPages: AppPages.routes,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.studentTheme,
      builder: (context, child) {
        return Stack(
          children: [
            child ?? const SizedBox.shrink(),
            const MandatoryUpdateWidget(),
          ],
        );
      },
    );
  }
}
