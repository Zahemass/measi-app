// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ApiService {
  // Check student (existing)
  static Future<bool> checkStudent(String registerNumber, String department, String shift) async {
    final response = await http.post(
      Uri.parse('$serverUrl/check-student'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({'registerNumber': registerNumber, 'department': department, 'shift': shift}),
    );
    return response.statusCode == 200;
  }

  // Mark attendance (improved: return message instead of just true/false)
  static Future<String> markAttendance(String registerNumber, String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$serverUrl/mark-attendance'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'registerNumber': registerNumber, 'sessionId': sessionId}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['message'] ?? "Attendance marked";
      } else {
        final data = json.decode(response.body);
        return data['message'] ?? "Error marking attendance";
      }
    } catch (e) {
      return "Server error. Try again later.";
    }
  }

  // Get poll status (for TOMORROW) -> returns map with date, vote, enabled, votingOpen
  static Future<Map<String, dynamic>> getPollStatus(String registerNumber) async {
    try {
      final response = await http.get(Uri.parse('$serverUrl/poll-status/$registerNumber'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        return data;
      }
    } catch (e) {
      // ignore
    }
    return {'date': '', 'vote': 'NO', 'enabled': true, 'votingOpen': true};
  }

  // Get whether poll is enabled (public endpoint) -> returns boolean
  static Future<bool> getPollEnabled() async {
    try {
      final response = await http.get(Uri.parse('$serverUrl/poll-enabled'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // server returns boolean true/false
        return data['enabled'] == true;
      }
    } catch (e) {
      // ignore
    }
    // fallback to true (default behaviour you wanted)
    return true;
  }

  // Vote for food (updates vote for TOMORROW on server)
  static Future<bool> voteFood(String registerNumber, String vote) async {
    try {
      final response = await http.post(
        Uri.parse('$serverUrl/vote-food'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'registerNumber': registerNumber, 'vote': vote}), // vote = "YES"|"NO"
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // NEW: get attendance dates for a student (returns List<String> of 'YYYY-MM-DD')
  static Future<List<String>> getAttendance(String registerNumber) async {
    try {
      final response = await http.get(Uri.parse('$serverUrl/get-attendance/$registerNumber'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        // Expecting an array of date strings
        if (data is List) {
          return List<String>.from(data.map((e) => e.toString()));
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }
}
