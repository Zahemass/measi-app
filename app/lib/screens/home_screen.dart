import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';
import '../services/api_service.dart';
import '../utils/constants.dart';
import './qr_scanner_screen.dart';
import './login_screen.dart';

class HomeScreen extends StatefulWidget {
  final String registerNumber;
  HomeScreen({required this.registerNumber});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool loading = true;
  bool pollEnabled = true;
  String vote = "NO";
  String date = "";
  String statusMessage = "";

  Set<DateTime> presentDates = {};
  Set<DateTime> absentDates = {};

  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

  @override
  void initState() {
    super.initState();
    loadAll();
  }

  Future<void> loadAll() async {
    setState(() => loading = true);

    final enabledFuture = ApiService.getPollEnabled();
    final pollFuture = ApiService.getPollStatus(widget.registerNumber);
    final attendanceFuture = ApiService.getAttendance(widget.registerNumber);

    final enabled = await enabledFuture;
    final poll = await pollFuture;
    final attendance = await attendanceFuture;

    final parsedPresent = <DateTime>{};
    for (final s in attendance) {
      try {
        final parts = s.split("-");
        if (parts.length == 3) {
          parsedPresent.add(DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2])));
        }
      } catch (_) {}
    }

    final today = DateTime.now();
    final start = today.subtract(Duration(days: 29));
    final parsedAbsent = <DateTime>{};
    for (int i = 0; i < 30; i++) {
      final dt = DateTime(start.year, start.month, start.day + i);
      if (!parsedPresent.contains(dt) && !dt.isAfter(today)) {
        parsedAbsent.add(dt);
      }
    }

    setState(() {
      pollEnabled = enabled;
      vote = (poll['vote'] as String?)?.toUpperCase() ?? "NO";
      date = poll['date'] ?? "";
      presentDates = parsedPresent;
      absentDates = parsedAbsent;
      loading = false;
    });
  }

  Future<void> submitVote(String newVote) async {
    setState(() => statusMessage = "Submitting...");
    final success = await ApiService.voteFood(widget.registerNumber, newVote);
    setState(() {
      if (success) {
        vote = newVote;
        statusMessage = "Vote updated to $newVote";
      } else {
        statusMessage = "Failed to update vote. Poll may be disabled or outside allowed time.";
      }
    });
  }

  void _logout() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => LoginScreen()),
          (route) => false,
    );
  }

  bool _isPresent(DateTime day) =>
      presentDates.any((p) => p.year == day.year && p.month == day.month && p.day == day.day);
  bool _isAbsent(DateTime day) =>
      absentDates.any((p) => p.year == day.year && p.month == day.month && p.day == day.day);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(appName),
        centerTitle: true,
        actions: [
          IconButton(icon: Icon(Icons.refresh), tooltip: "Refresh", onPressed: loadAll),
          IconButton(icon: Icon(Icons.logout), tooltip: "Logout", onPressed: _logout),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: loading
            ? Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Attendance (last 30 days)",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              SizedBox(height: 8),
              _buildCalendar(),
              SizedBox(height: 8),
              _buildLegend(),
              SizedBox(height: 18),
              Text("Poll for: $date", style: TextStyle(fontSize: 16)),
              SizedBox(height: 8),
              if (!pollEnabled) _buildDisabledPollNotice(),
              SizedBox(height: 12),
              Text("Your vote: $vote", style: TextStyle(fontSize: 18)),
              SizedBox(height: 12),
              _buildVoteButtons(),
              if (statusMessage.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8.0),
                  child: Text(statusMessage, style: TextStyle(color: Colors.green)),
                ),
              Divider(),
              SizedBox(height: 12),
              ElevatedButton.icon(
                icon: Icon(Icons.qr_code_scanner),
                label: Text("Scan QR to mark attendance"),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (_) => QRScannerScreen(registerNumber: widget.registerNumber)),
                  ).then((_) => loadAll());
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCalendar() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: TableCalendar(
        firstDay: DateTime.now().subtract(Duration(days: 365)),
        lastDay: DateTime.now().add(Duration(days: 365)),
        focusedDay: _focusedDay,
        calendarFormat: CalendarFormat.month,
        selectedDayPredicate: (day) =>
        _selectedDay != null && day.year == _selectedDay!.year && day.month == _selectedDay!.month && day.day == _selectedDay!.day,
        onDaySelected: (selectedDay, focusedDay) {
          setState(() {
            _selectedDay = selectedDay;
            _focusedDay = focusedDay;
          });
        },
        calendarBuilders: CalendarBuilders(
          defaultBuilder: (context, day, focusedDay) {
            if (_isPresent(day)) return _dayCircle(day, Colors.green.shade400);
            if (_isAbsent(day) && !day.isAfter(DateTime.now())) return _dayCircle(day, Colors.red.shade300);
            return Center(child: Text('${day.day}'));
          },
          todayBuilder: (context, day, focusedDay) {
            final color = _isPresent(day)
                ? Colors.green.shade400
                : _isAbsent(day)
                ? Colors.red.shade300
                : Colors.blue.shade200;
            return _dayCircle(day, color, border: true);
          },
        ),
      ),
    );
  }

  Widget _dayCircle(DateTime day, Color color, {bool border = false}) {
    return Container(
      margin: const EdgeInsets.all(6.0),
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: border ? Border.all(color: Colors.black54) : null,
      ),
      alignment: Alignment.center,
      child: Text('${day.day}', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildLegend() {
    return Wrap(
      spacing: 12,
      children: [
        _legendDot(Colors.green.shade400, "Present"),
        _legendDot(Colors.red.shade300, "Absent"),
        _legendDot(Colors.blue.shade200, "Today"),
      ],
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 14, height: 14, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
      SizedBox(width: 6),
      Text(label),
    ]);
  }

  Widget _buildDisabledPollNotice() {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.amber[100], borderRadius: BorderRadius.circular(6)),
      child: Row(children: [
        Icon(Icons.block),
        SizedBox(width: 8),
        Expanded(child: Text("Voting is currently disabled by admin.")),
      ]),
    );
  }

  Widget _buildVoteButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton(
            onPressed: (!pollEnabled || vote == "YES") ? null : () => submitVote("YES"),
            child: Text("Vote YES"),
          ),
        ),
        SizedBox(width: 12),
        Expanded(
          child: ElevatedButton(
            onPressed: (!pollEnabled || vote == "NO") ? null : () => submitVote("NO"),
            child: Text("Vote NO"),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
          ),
        ),
      ],
    );
  }
}
