// pages/AddStudent.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
} from "@mui/material";
import Navbar from "../components/Navbar";

function AddStudent() {
  const [student, setStudent] = useState({
    name: "",
    registerNumber: "",
    department: "",
    shift: "",
  });
  const [qrCode, setQrCode] = useState("");
  const [qrMessage, setQrMessage] = useState("");

  const [pollEnabled, setPollEnabled] = useState(true);
  const [loadingPollToggle, setLoadingPollToggle] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Fetch QR automatically
  const fetchQr = async () => {
    try {
      const response = await axios.get("http://localhost:5000/generate-qr");
      setQrCode(response.data.qrCode);
      setQrMessage("");
    } catch (error) {
      setQrCode("");
      setQrMessage("QR code is only available between 1 PM and 3 PM");
    }
  };

  // Poll enabled state
  const fetchPollEnabled = async () => {
    try {
      const res = await axios.get("http://localhost:5000/admin/poll-status");
      setPollEnabled(res.data.enabled);
    } catch (err) {
      console.error("Failed to fetch poll enabled:", err);
    } finally {
      setLoadingPollToggle(false);
    }
  };

  useEffect(() => {
    fetchQr();
    fetchPollEnabled();
    const interval = setInterval(fetchQr, 60000); // refresh QR every 60 sec
    return () => clearInterval(interval);
  }, []);

  const handleTogglePoll = async () => {
    setToggling(true);
    try {
      const res = await axios.post("http://localhost:5000/admin/poll-status", { enabled: !pollEnabled });
      setPollEnabled(res.data.enabled);
      alert(`Polls are now ${res.data.enabled ? "ENABLED" : "DISABLED"}`);
    } catch (err) {
      console.error("Toggle failed", err);
      alert("Failed to update poll status");
    } finally {
      setToggling(false);
    }
  };

  const handleAddStudent = async () => {
    try {
      await axios.post("http://localhost:5000/add-student", student);
      alert("Student added successfully!");
      setStudent({ name: "", registerNumber: "", department: "", shift: "" });
    } catch (error) {
      console.error("Error adding student:", error);
      alert("Failed to add student.");
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h4">Admin Panel - Add Student</Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography>Polls</Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={pollEnabled}
                    onChange={handleTogglePoll}
                    disabled={loadingPollToggle || toggling}
                  />
                }
                label={pollEnabled ? "ENABLED" : "DISABLED"}
              />
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Student Name"
                variant="outlined"
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Register Number"
                variant="outlined"
                value={student.registerNumber}
                onChange={(e) => setStudent({ ...student, registerNumber: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Department</InputLabel>
                <Select
                  value={student.department}
                  onChange={(e) => setStudent({ ...student, department: e.target.value })}
                  label="Department"
                >
                  <MenuItem value="BSc IT">BSc IT</MenuItem>
                  <MenuItem value="BSc CS">BSc CS</MenuItem>
                  <MenuItem value="BCA">BCA</MenuItem>
                  <MenuItem value="BSc DS">BSc DS</MenuItem>
                  <MenuItem value="BSc AI">BSc AI</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Shift</InputLabel>
                <Select
                  value={student.shift}
                  onChange={(e) => setStudent({ ...student, shift: e.target.value })}
                  label="Shift"
                >
                  <MenuItem value="I">I</MenuItem>
                  <MenuItem value="II">II</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={handleAddStudent}>
                Add Student
              </Button>
            </Grid>
          </Grid>

          {/* QR Section */}
          <Box sx={{ mt: 4, textAlign: "center" }}>
            {qrCode ? (
              <>
                <Typography variant="h6" gutterBottom>
                  QR Code (Valid 1 PM - 3 PM)
                </Typography>
                <img src={qrCode} alt="QR Code" style={{ width: "200px", height: "200px" }} />
              </>
            ) : (
              <Typography color="error">{qrMessage}</Typography>
            )}
          </Box>
        </Paper>
      </Container>
    </>
  );
}

export default AddStudent;
