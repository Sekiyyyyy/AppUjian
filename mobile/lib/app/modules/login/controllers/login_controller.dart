import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../routes/app_pages.dart';
import '../../../data/api_client.dart';

class LoginController extends GetxController {
  final nisnController = TextEditingController();
  final passwordController = TextEditingController();
  
  final isLoading = false.obs;
  final errorMessage = ''.obs;

  final _dio = ApiClient().dio;

  @override
  void onClose() {
    nisnController.dispose();
    passwordController.dispose();
    super.onClose();
  }

  Future<void> login() async {
    if (nisnController.text.isEmpty || passwordController.text.isEmpty) {
      errorMessage.value = "NISN dan Password tidak boleh kosong";
      return;
    }

    isLoading.value = true;
    errorMessage.value = '';

    try {
      final response = await _dio.post('/api/v1/auth/login', data: {
        'username': nisnController.text.trim(),
        'password': passwordController.text,
      });

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['user']['role'] != 'STUDENT') {
          errorMessage.value = "Aplikasi ini khusus untuk Siswa";
          return;
        }

        final token = data['token'];
        ApiClient().setToken(token);
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        await prefs.setString('username', data['user']['username'] ?? '');
        await prefs.setString('name', data['user']['name'] ?? 'Siswa');

        if (data['student'] != null) {
          final nisn = data['student']['nisn']?.toString() ?? '';
          final nis = data['student']['nis']?.toString() ?? '';
          String combinedNis = '';
          if (nis.isNotEmpty) {
            combinedNis = "$nisn/$nis";
          } else {
            combinedNis = "$nisn/-";
          }
          await prefs.setString('nis', combinedNis);
        }

        Get.offAllNamed(Routes.MAIN);
      }
    } on DioException catch (e) {
      if (e.response != null) {
        errorMessage.value = e.response?.data['error'] ?? "Gagal login. Periksa kembali NISN dan password.";
      } else {
        errorMessage.value = "Koneksi ke server gagal. Periksa jaringan Anda.";
      }
    } catch (e) {
      errorMessage.value = "Terjadi kesalahan tidak terduga";
    } finally {
      isLoading.value = false;
    }
  }
}
