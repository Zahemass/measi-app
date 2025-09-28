// admin-react/src/pages/PollSummary.jsx
import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Grid,
  Box,
  InputAdornment,
} from "@mui/material";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import Navbar from "../components/Navbar";
import axios from "axios";

function PollSummary() {
  const [studentsAll, setStudentsAll] = useState([]);
  const [countYes, setCountYes] = useState(0);
  const [countNo, setCountNo] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // default today
  const [days, setDays] = useState(7);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPollSummary(date);
  }, [date]);

  const fetchPollSummary = async (selectedDate) => {
    try {
      const res = await fetch(`http://localhost:5000/poll-summary/${selectedDate}`);
      const data = await res.json();
      setStudentsAll(data.studentsAll || []);
      setCountYes(data.countYes || 0);
      setCountNo(data.countNo || 0);
    } catch (err) {
      console.error("Error fetching poll summary:", err);
    }
  };

  const chartData = [
    { name: "YES", value: countYes },
    { name: "NO", value: countNo },
  ];

  const COLORS = ["#4CAF50", "#F44336"];

  // Export handler
  const handleExport = async () => {
    setExporting(true);
    try {
      // Build query params: use endDate (date) and days
      const params = new URLSearchParams();
      if (date) params.append("endDate", date);
      if (days) params.append("days", String(days));
      const url = `http://localhost:5000/export-report?${params.toString()}`;

      // Request as blob
      const response = await axios.get(url, { responseType: "blob" });

      // Create download link
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      // infer filename from headers if present
      const disposition = response.headers["content-disposition"] || "";
      let filename = `poll_report_${date}_last${days}days.xlsx`;
      const match = /filename="(.+)"/.exec(disposition);
      if (match && match[1]) filename = match[1];

      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // IE fallback
        window.navigator.msSaveOrOpenBlob(blob, filename);
      } else {
        const link = document.createElement("a");
        const urlBlob = window.URL.createObjectURL(blob);
        link.href = urlBlob;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(urlBlob);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed. See console for details.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Poll Summary
          </Typography>

          <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                label="End Date"
                type="date"
                variant="outlined"
                fullWidth
                value={date}
                onChange={(e) => setDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                label="Days"
                type="number"
                variant="outlined"
                fullWidth
                value={days}
                onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={2}>
              <Button variant="contained" color="primary" fullWidth onClick={() => fetchPollSummary(date)}>
                Refresh
              </Button>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Button variant="outlined" color="primary" onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : `Export Report (${days} days)`}
              </Button>
            </Grid>
          </Grid>

          {/* Chart + Total Count */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6">Total YES Votes</Typography>
                <Typography variant="h3" color="success.main">
                  {countYes}
                </Typography>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>
                  NO votes: {countNo}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <PieChart width={300} height={250}>
                <Pie data={chartData} cx={150} cy={120} innerRadius={60} outerRadius={90} dataKey="value">
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </Grid>
          </Grid>

          {/* Table */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Students (with vote)
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Register Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Shift</TableCell>
                    <TableCell>Vote</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentsAll.length > 0 ? (
                    studentsAll.map((student, index) => (
                      <TableRow key={index}>
                        <TableCell>{student.registerNumber}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>{student.shift}</TableCell>
                        <TableCell>{student.vote}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No data for this date
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Container>
    </>
  );
}

export default PollSummary;
