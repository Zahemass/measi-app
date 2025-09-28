class Student {
  final String registerNumber;
  final String department;
  final String shift;

  Student({
    required this.registerNumber,
    required this.department,
    required this.shift,
  });

  // Convert a Student object into a JSON map (for API requests)
  Map<String, dynamic> toJson() {
    return {
      'registerNumber': registerNumber,
      'department': department,
      'shift': shift,
    };
  }

  // Create a Student object from JSON data (for API responses)
  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      registerNumber: json['registerNumber'],
      department: json['department'],
      shift: json['shift'],
    );
  }
}
