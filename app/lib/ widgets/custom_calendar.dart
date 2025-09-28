import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../utils/constants.dart'; // Ensure you have serverUrl defined here

class CustomCalendar extends StatefulWidget {
  final String registerNumber;

  const CustomCalendar({required this.registerNumber, Key? key}) : super(key: key);

  @override
  _CustomCalendarState createState() => _CustomCalendarState();
}

class _CustomCalendarState extends State<CustomCalendar> {
  late DateTime _focusedDay;
  DateTime? _selectedDay;
  Set<DateTime> _attendanceDays = {}; // Stores attendance-marked dates

  @override
  void initState() {
    super.initState();
    _focusedDay = DateTime.now();
    _selectedDay = _focusedDay;
    _fetchAttendance(); // Fetch attendance on load
  }

  Future<void> _fetchAttendance() async {
    try {
      final response = await http.get(Uri.parse('$serverUrl/get-attendance/${widget.registerNumber}'));

      if (response.statusCode == 200) {
        final List<dynamic> attendanceData = json.decode(response.body);
        Set<DateTime> attendedDates = attendanceData.map((dateString) {
          DateTime date = DateTime.parse(dateString);
          return DateTime(date.year, date.month, date.day); // Normalize time
        }).toSet();

        setState(() {
          _attendanceDays = attendedDates;
        });

        print("Fetched Attendance Dates: $_attendanceDays"); // Debugging log
      } else {
        print("Error fetching attendance: ${response.statusCode}");
      }
    } catch (error) {
      print("Error: $error");
    }
  }

  @override
  Widget build(BuildContext context) {
    return TableCalendar(
      firstDay: DateTime.utc(2020, 1, 1),
      lastDay: DateTime.utc(2030, 12, 31),
      focusedDay: _focusedDay,
      calendarFormat: CalendarFormat.month,
      selectedDayPredicate: (day) {
        return isSameDay(_selectedDay, day);
      },
      onDaySelected: (selectedDay, focusedDay) {
        setState(() {
          _selectedDay = selectedDay;
          _focusedDay = focusedDay;
        });
      },
      headerStyle: HeaderStyle(
        formatButtonVisible: false,
        titleCentered: true,
        titleTextStyle: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
      calendarStyle: CalendarStyle(
        todayDecoration: BoxDecoration(
          color: Colors.blue,
          shape: BoxShape.circle,
        ),
        selectedDecoration: BoxDecoration(
          color: Colors.blue,
          shape: BoxShape.circle,
        ),
        defaultDecoration: BoxDecoration(
          shape: BoxShape.circle,
        ),
      ),
      calendarBuilders: CalendarBuilders(
        defaultBuilder: (context, date, focusedDay) {
          if (_attendanceDays.any((d) => isSameDay(d, date))) {
            return Container(
              margin: EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.green, // Full background color for attendance days
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  '${date.day}',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ),
            );
          }
          return null;
        },
      ),
    );
  }
}
