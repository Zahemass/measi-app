// lib/widgets/poll_widget.dart
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PollWidget extends StatefulWidget {
  final String registerNumber;
  PollWidget({required this.registerNumber});

  @override
  _PollWidgetState createState() => _PollWidgetState();
}

class _PollWidgetState extends State<PollWidget> {
  bool _loading = true;
  bool _votedYes = false;
  bool _pollOpen = false;
  String _statusText = '';

  @override
  void initState() {
    super.initState();
    _init();
  }

  DateTime _nowInIST() {
    // India is UTC+5:30
    final now = DateTime.now().toUtc().add(Duration(hours: 5, minutes: 30));
    return now;
  }

  bool _isPollWindow(DateTime ist) {
    // Poll open between 17:00 (5 PM) and 06:00 next day
    final hour = ist.hour;
    if (hour >= 17) return true; // 17:00 - 23:59
    if (hour < 6) return true; // 00:00 - 05:59
    return false;
  }

  Future<void> _init() async {
    setState(() {
      _loading = true;
    });

    final ist = _nowInIST();
    final open = _isPollWindow(ist);

    final vote = await ApiService.getPollStatus(widget.registerNumber);

    setState(() {
      _pollOpen = open;
      _votedYes = vote == 'YES';
      _statusText = open ? 'Poll is OPEN' : 'Poll is CLOSED (opens 5:00 PM)';
      _loading = false;
    });
  }

  Future<void> _toggleVote(bool value) async {
    if (!_pollOpen) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Poll is closed.')));
      return;
    }

    final vote = value ? 'YES' : 'NO';
    final ok = await ApiService.voteFood(widget.registerNumber, vote);

    if (ok) {
      setState(() {
        _votedYes = value;
      });
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Vote saved: $vote')));
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to save vote. Try again.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return SizedBox(height: 80, child: Center(child: CircularProgressIndicator()));

    return Card(
      margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 3,
      child: Padding(
        padding: EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: Text('Do you want food tomorrow?', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold))),
                Switch(
                  value: _votedYes,
                  onChanged: _pollOpen ? (val) => _toggleVote(val) : null,
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                _pollOpen ? 'You can change until 06:00 AM' : 'Closed — opens at 5:00 PM',
                style: TextStyle(color: _pollOpen ? Colors.green : Colors.grey[700]),
              ),
            ),
            SizedBox(height: 8),
            Row(
              children: [
                Text('Status: ', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(_statusText)
              ],
            ),
          ],
        ),
      ),
    );
  }
}
