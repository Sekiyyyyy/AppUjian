import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;
  String? _cachedToken;

  ApiClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        sendTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (_cachedToken != null && _cachedToken!.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $_cachedToken';
          } else {
            final prefs = await SharedPreferences.getInstance();
            final token = prefs.getString('token');
            if (token != null && token.isNotEmpty) {
              _cachedToken = token;
              options.headers['Authorization'] = 'Bearer $token';
            }
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) {
          return handler.next(error);
        },
      ),
    );
  }

  static String? _customBaseUrl;

  static String get defaultBaseUrl {
    return 'https://ujian.tiksmkn1beringin.my.id';
  }

  static String get baseUrl {
    return _customBaseUrl ?? defaultBaseUrl;
  }

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('server_base_url');
    if (savedUrl != null && 
        savedUrl.isNotEmpty && 
        !savedUrl.contains('192.168.') && 
        !savedUrl.contains('localhost') && 
        !savedUrl.contains('127.0.0.1')) {
      _customBaseUrl = savedUrl;
      _instance.dio.options.baseUrl = savedUrl;
    } else {
      _customBaseUrl = defaultBaseUrl;
      _instance.dio.options.baseUrl = defaultBaseUrl;
      await prefs.setString('server_base_url', defaultBaseUrl);
    }
  }

  void updateBaseUrl(String newUrl) {
    String formatted = newUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://$formatted';
    }
    if (formatted.endsWith('/')) {
      formatted = formatted.substring(0, formatted.length - 1);
    }
    _customBaseUrl = formatted;
    dio.options.baseUrl = formatted;
    SharedPreferences.getInstance().then((prefs) {
      prefs.setString('server_base_url', formatted);
    });
  }

  void setToken(String token) {
    _cachedToken = token;
    dio.options.headers['Authorization'] = 'Bearer $token';
  }

  void clearToken() {
    _cachedToken = null;
    dio.options.headers.remove('Authorization');
  }
}
