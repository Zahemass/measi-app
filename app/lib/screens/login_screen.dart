// lib/screens/login_screen.dart
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/student.dart';
import '../utils/constants.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _registerNumberController = TextEditingController();
  bool _isLoading = false;

  // Dropdown values
  String? _selectedDepartment;
  String? _selectedShift;

  final List<String> departments = ["BSc IT", "BSc CS", "BCA", "BSc DS", "BSc AI"];
  final List<String> shifts = ["I", "II"];

  Future<void> _login() async {
    final String registerNumber = _registerNumberController.text.trim();

    if (registerNumber.isEmpty || _selectedDepartment == null || _selectedShift == null) {
      _showMessage("Please fill all fields.");
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.post(
        Uri.parse('$serverUrl/check-student'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(Student(
          registerNumber: registerNumber,
          department: _selectedDepartment!,
          shift: _selectedShift!,
        ).toJson()),
      );

      if (response.statusCode == 200) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => HomeScreen(registerNumber: registerNumber),
          ),
        );
      } else {
        _showMessage("Student not found. Please check your details.");
      }
    } catch (e) {
      _showMessage("An error occurred. Please check your connection.");
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: Duration(seconds: 3),
      ),
    );
  }

  @override
  void dispose() {
    _registerNumberController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Use MediaQuery to add extra bottom padding when keyboard is visible
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Scaffold(
      appBar: AppBar(
        title: Text("Student Login"),
        centerTitle: true,
      ),
      body: SafeArea(
        child: GestureDetector(
          // Tap outside to dismiss keyboard
          onTap: () => FocusScope.of(context).unfocus(),
          child: SingleChildScrollView(
            // This makes the screen scrollable if keyboard appears or on small devices
            padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + bottomInset),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: 600), // nice for tablets
                child: Column(
                  mainAxisSize: MainAxisSize.min, // important to avoid expanding to full height
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SizedBox(height: 24),
                    Image.asset(
                      'assets/images/logo.png',
                      height: 120,
                    ),
                    SizedBox(height: 24),

                    TextField(
                      controller: _registerNumberController,
                      decoration: InputDecoration(
                        labelText: "Register Number",
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                    SizedBox(height: 20),

                    // Department Dropdown
                    DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        labelText: "Department",
                        border: OutlineInputBorder(),
                      ),
                      value: _selectedDepartment,
                      items: departments.map((dept) {
                        return DropdownMenuItem(
                          value: dept,
                          child: Text(dept),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedDepartment = value;
                        });
                      },
                    ),
                    SizedBox(height: 20),

                    // Shift Dropdown
                    DropdownButtonFormField<String>(
                      decoration: InputDecoration(
                        labelText: "Shift",
                        border: OutlineInputBorder(),
                      ),
                      value: _selectedShift,
                      items: shifts.map((shift) {
                        return DropdownMenuItem(
                          value: shift,
                          child: Text(shift),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedShift = value;
                        });
                      },
                    ),
                    SizedBox(height: 24),

                    _isLoading
                        ? Center(child: CircularProgressIndicator())
                        : ElevatedButton(
                      onPressed: _login,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 14.0),
                        child: Text("Login", style: TextStyle(fontSize: 16)),
                      ),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),

                    SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
