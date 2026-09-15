import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use 10.0.2.2 for Android emulator to access PC localhost, 
  // or change to the specific local IP address of the backend server.
  static const String baseUrl = 'http://10.0.2.2:8080/api/v1';

  static Future<Map<String, dynamic>> login(String nisn, String token) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/student/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'nisn': nisn, 'token': token}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Save token to SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        if (data['token'] != null) {
          await prefs.setString('student_token', data['token']);
        }
        
        return {'success': true, 'data': data};
      } else {
        final data = jsonDecode(response.body);
        return {'success': false, 'message': data['error'] ?? 'Login failed'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('student_token');
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('student_token');
  }
}
