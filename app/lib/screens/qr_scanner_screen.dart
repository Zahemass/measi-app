import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../services/api_service.dart';

class QRScannerScreen extends StatefulWidget {
  final String registerNumber;
  QRScannerScreen({required this.registerNumber});

  @override
  _QRScannerScreenState createState() => _QRScannerScreenState();
}

class _QRScannerScreenState extends State<QRScannerScreen> {
  MobileScannerController _cameraController = MobileScannerController();
  bool _isLoading = false;
  bool _isCameraActive = true;

  void _onDetect(BarcodeCapture barcodeCapture) async {
    final List<Barcode> barcodes = barcodeCapture.barcodes;
    if (barcodes.isEmpty || barcodes[0].rawValue == null) return;

    final String sessionId = barcodes[0].rawValue!;

    setState(() {
      _isCameraActive = false;
      _isLoading = true;
    });

    String message = await ApiService.markAttendance(widget.registerNumber, sessionId);

    setState(() {
      _isLoading = false;
      _isCameraActive = true;
    });

    _showMessage(message);  // <-- show exact backend message
  }


  void _showMessage(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Message"),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text("OK")),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _cameraController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("QR Scanner"), centerTitle: true),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: _isCameraActive
                ? MobileScanner(controller: _cameraController, onDetect: _onDetect)
                : Center(child: Text("Camera paused", style: TextStyle(fontSize: 18))),
          ),
          Expanded(
            flex: 1,
            child: Center(
              child: _isLoading
                  ? CircularProgressIndicator()
                  : ElevatedButton(
                onPressed: () => setState(() => _isCameraActive = true),
                child: Text("Scan QR Code"),
                style: ElevatedButton.styleFrom(padding: EdgeInsets.symmetric(horizontal: 40, vertical: 15)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
