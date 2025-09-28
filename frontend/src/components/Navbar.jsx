// src/components/Navbar.jsx
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const isLoggedIn = localStorage.getItem("adminAuth") === "true";
  const adminEmail = localStorage.getItem("adminEmail") || "";

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    localStorage.removeItem("adminEmail");
    navigate("/", { replace: true });
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: "#2C3930" }}>
        <Toolbar>
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ display: { xs: "block", md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Logo and Title */}
          <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
            <img src={logo} alt="Logo" style={{ height: 50, marginRight: 10 }} />
            <Typography variant="h6" component={Link} to={isLoggedIn ? "/dashboard" : "/"} sx={{ textDecoration: "none", color: "white" }}>
              Student Management
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          {isLoggedIn && (
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Button color="inherit" component={Link} to="/dashboard">
                Add Student
              </Button>
              <Button color="inherit" component={Link} to="/students">
                Student List
              </Button>
              <Button color="inherit" component={Link} to="/attendance">
                Attendance
              </Button>
              <Button color="inherit" component={Link} to="/poll-summary">
                Poll Summary
              </Button>
              <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
                Logout
              </Button>
            </Box>
          )}

          {!isLoggedIn && (
            <Box>
              <Button color="inherit" component={Link} to="/">
                Login
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="left" open={mobileOpen} onClose={handleDrawerToggle} sx={{ display: { xs: "block", md: "none" } }}>
        <List>
          {isLoggedIn ? (
            <>
              <ListItem button component={Link} to="/dashboard" onClick={handleDrawerToggle}>
                <ListItemText primary="Add Student" />
              </ListItem>
              <ListItem button component={Link} to="/students" onClick={handleDrawerToggle}>
                <ListItemText primary="Student List" />
              </ListItem>
              <ListItem button component={Link} to="/attendance" onClick={handleDrawerToggle}>
                <ListItemText primary="Attendance" />
              </ListItem>
              <ListItem button component={Link} to="/poll-summary" onClick={handleDrawerToggle}>
                <ListItemText primary="Poll Summary" />
              </ListItem>
              <ListItem button onClick={() => { handleDrawerToggle(); handleLogout(); }}>
                <ListItemText primary="Logout" />
              </ListItem>
            </>
          ) : (
            <ListItem button component={Link} to="/" onClick={handleDrawerToggle}>
              <ListItemText primary="Login" />
            </ListItem>
          )}
        </List>
      </Drawer>
    </>
  );
}

export default Navbar;
