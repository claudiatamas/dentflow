import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './assets/pages/Home';
import Login from './assets/pages/Login';
import Signup from './assets/pages/Signup';
import DashboardDoctor from './assets/pages/DashboardDoctor';
import DashboardAdmin from './assets/pages/DashboardAdmin';
import DashboardPatient from './assets/pages/DashboardPatient';
import Profile from './assets/pages/Profile';
import StockManagement from './assets/pages/StockManagement';
import AdminBlog from './assets/pages/AdminBlog';
import ViewDoctors from './assets/pages/ViewDoctors';
import MakeAppointmentModal from './assets/components/MakeAppointmentModal';
import ProfileAdmin from './assets/pages/Profile_Admin';
import ProfilePatient from './assets/pages/Profile_Patient';
import AdminUserManagement from './assets/pages/AdminUsers';
import ChatMessages from './assets/pages/ChatMessages';
import MedicalRecords from './assets/pages/MedicalRecords';
import ActivityPage from './assets/pages/ActivityPage';
import HelpPage from './assets/pages/HelpPage';
import AdminHelpPage from './assets/pages/AdminHelpPage';
import AppointmentsListDoctor from './assets/pages/AppointmentsListDoctor';
import AppointmentsListPatient from './assets/pages/AppointmentsListPatient';
import AdminAppFeedback from './assets/pages/AdminAppFeedback';
import DentalAIScan from './assets/pages/DentalAIScan';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />}/>
        <Route path="/signup" element={<Signup />}/>
        <Route path="/dashboard_patient" element={<DashboardPatient />}/>
        <Route path="/dashboard_doctor" element={<DashboardDoctor/>}/>
        <Route path="/dashboard_admin" element={<DashboardAdmin/>}/>
        <Route path="/profile" element={<Profile/>}/>
        <Route path="/stock" element={<StockManagement/>}/>
        <Route path="/adminblog" element={<AdminBlog/>}/>
        <Route path="/view_doctors" element={<ViewDoctors/>}/>
        <Route path="/appointment_patient" element={<MakeAppointmentModal/>}/>
        <Route path="/profile_admin" element={<ProfileAdmin/>}/>
        <Route path="/profile_patient" element={<ProfilePatient/>}/>
        <Route path="/admin_users" element={<AdminUserManagement/>}/>
        <Route path="/chat_users" element={<ChatMessages/>}/>
        <Route path="/medical_records" element={<MedicalRecords/>}/>
        <Route path="/activity_user" element={<ActivityPage/>}/>
        <Route path="/help_user" element={<HelpPage/>}/>
        <Route path="/help_admin" element={<AdminHelpPage/>}/>
        <Route path="/appointments_doctor" element={<AppointmentsListDoctor />} />
        <Route path="/appointments_patient" element={<AppointmentsListPatient />} />
        <Route path="/app_feedback" element={<AdminAppFeedback />} />
        <Route path="/dental_scan" element={<DentalAIScan />} />
      
      </Routes>
    </Router>
  );
}

export default App;
