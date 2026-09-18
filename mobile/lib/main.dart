import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app/routes/app_pages.dart';
import 'app/theme/app_theme.dart';
import 'app/data/api_client.dart';

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

  runApp(
    GetMaterialApp(
      title: "App Ujian",
      initialRoute: initialRoute,
      getPages: AppPages.routes,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.studentTheme,
    ),
  );
}
