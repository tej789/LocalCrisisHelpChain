import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
    const [allNgos, setAllNgos] = useState([]);
const [allVolunteers, setAllVolunteers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("all");
const [volSearch, setVolSearch] = useState("");
const [volStatusFilter, setVolStatusFilter] = useState("all");
const fetchAllUsers = async () => {
  try {
    const res = await axios.get(
     `${process.env.REACT_APP_API_URL}/api/admin/all-users`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setAllNgos(res.data.ngos);
    setAllVolunteers(res.data.volunteers);
  } catch (err) {
    console.error(err);
  }
};
  const fetchPending = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/pending`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNgos(res.data.ngos);
      setVolunteers(res.data.volunteers);
    }catch (err) {
  console.error(err);

  if (err.response?.status === 401 || err.response?.status === 403) {
    localStorage.clear();
    navigate("/login", { replace: true });
  }
}
  };

  const approveNGO = async (id) => {
    await axios.put(
     `${process.env.REACT_APP_API_URL}/api/admin/approve-ngo/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
      fetchAllUsers(); 
    fetchPending();
  };

  const rejectNGO = async (id) => {
    await axios.delete(
     `${process.env.REACT_APP_API_URL}/api/admin/reject-ngo/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
      fetchAllUsers(); 
    fetchPending();
  };

  const approveVolunteer = async (id) => {
    await axios.put(
      `${process.env.REACT_APP_API_URL}/api/admin/approve-volunteer/${id}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
      fetchAllUsers(); 
    fetchPending();
  };

  const rejectVolunteer = async (id) => {
    await axios.delete(
      `${process.env.REACT_APP_API_URL}/api/admin/reject-volunteer/${id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
      fetchAllUsers(); 
    fetchPending();
  };

  const handleLogout = () => {
  localStorage.clear();
  navigate("/login", { replace: true });
};
useEffect(() => {
  if (!token) {
    navigate("/login", { replace: true });
    return;
  }
 fetchAllUsers();  
  fetchPending();
}, [token]);


  return (
    <div style={{ padding: "40px", backgroundColor: "#f4f6f9", minHeight: "100vh" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
        <h1>Admin Dashboard</h1>
        <button style={logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "40px" }}>
        <div style={statsCard}>
          <h3>Pending NGOs</h3>
          <p style={statsNumber}>{ngos.length}</p>
        </div>

        <div style={statsCard}>
          <h3>Pending Volunteers</h3>
          <p style={statsNumber}>{volunteers.length}</p>
        </div>
      </div>

      {/* NGO SECTION */}
      <h2>Pending NGOs</h2>
      {ngos.length === 0 ? (
        <p>No pending NGOs</p>
      ) : (
        ngos.map((ngo) => (
          <div key={ngo._id} style={cardStyle}>
            <p><strong>Name:</strong> {ngo.name}</p>
            <p><strong>Email:</strong> {ngo.email}</p>
            <div style={{ marginTop: "10px" }}>
              <button style={approveBtn} onClick={() => approveNGO(ngo._id)}>
                Approve
              </button>
              <button style={rejectBtn} onClick={() => rejectNGO(ngo._id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}

      {/* VOLUNTEER SECTION */}
      <h2 style={{ marginTop: "40px" }}>Pending Volunteers</h2>
      {volunteers.length === 0 ? (
        <p>No pending Volunteers</p>
      ) : (
        volunteers.map((vol) => (
          <div key={vol._id} style={cardStyle}>
            <p><strong>Name:</strong> {vol.name}</p>
            <p><strong>Email:</strong> {vol.email}</p>
            <div style={{ marginTop: "10px" }}>
              <button style={approveBtn} onClick={() => approveVolunteer(vol._id)}>
                Approve
              </button>
              <button style={rejectBtn} onClick={() => rejectVolunteer(vol._id)}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}


      {/* ================= ALL NGOs ================= */}
<h2 style={{ marginTop: "60px" }}>All NGOs</h2>
<div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
  <input
    type="text"
    placeholder="Search..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />

  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
  >
    <option value="all">All</option>
    <option value="approved">Approved</option>
    <option value="pending">Pending</option>
  </select>
</div>

<table style={tableStyle}>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>

  <tbody>
   {allNgos
  .filter((ngo) => {
    const matchesSearch =
      ngo.name.toLowerCase().includes(search.toLowerCase()) ||
      ngo.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && ngo.verified) ||
      (statusFilter === "pending" && !ngo.verified);

    return matchesSearch && matchesStatus;
  })
  .map((ngo) => (
    <tr key={ngo._id}>
      <td>{ngo.name}</td>
      <td>{ngo.email}</td>
      <td>
        <span style={badgeStyle(ngo.verified)}>
          {ngo.verified ? "Approved" : "Pending"}
        </span>
      </td>
    </tr>
  ))}
  </tbody>
</table>
{/* ================= ALL VOLUNTEERS ================= */}
<h2 style={{ marginTop: "40px" }}>All Volunteers</h2>
<div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
  <input
    type="text"
    placeholder="Search Volunteers..."
    value={volSearch}
    onChange={(e) => setVolSearch(e.target.value)}
  />

  <select
    value={volStatusFilter}
    onChange={(e) => setVolStatusFilter(e.target.value)}
  >
    <option value="all">All</option>
    <option value="approved">Approved</option>
    <option value="pending">Pending</option>
  </select>
</div>


<table style={tableStyle}>
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {allVolunteers.map((vol) => (
      <tr key={vol._id}>
        <td>{vol.name}</td>
        <td>{vol.email}</td>
        <td>
          <span
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              backgroundColor: vol.verified ? "#d4edda" : "#fff3cd",
              color: vol.verified ? "#155724" : "#856404",
              fontWeight: "bold"
            }}
          >
            {vol.verified ? "Approved" : "Pending"}
          </span>
        </td>
      </tr>
    ))}
  </tbody>
</table>
    </div>
  );
};


/* ===== Styles ===== */

const cardStyle = {
  backgroundColor: "#ffffff",
  padding: "20px",
  marginBottom: "20px",
  borderRadius: "10px",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

const approveBtn = {
  backgroundColor: "#4CAF50",
  color: "white",
  padding: "8px 14px",
  border: "none",
  borderRadius: "6px",
  marginRight: "10px",
  cursor: "pointer"
};

const rejectBtn = {
  backgroundColor: "#f44336",
  color: "white",
  padding: "8px 14px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const logoutBtn = {
  backgroundColor: "#333",
  color: "white",
  padding: "8px 14px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

const statsCard = {
  flex: 1,
  padding: "20px",
  borderRadius: "12px",
  backgroundColor: "#ffffff",
  textAlign: "center",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

const statsNumber = {
  fontSize: "28px",
  fontWeight: "bold",
  marginTop: "10px"
};
const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "20px",
  backgroundColor: "#ffffff",
  borderRadius: "10px",
  overflow: "hidden",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

const badgeStyle = (verified) => ({
  padding: "6px 12px",
  borderRadius: "20px",
  backgroundColor: verified ? "#d4edda" : "#fff3cd",
  color: verified ? "#155724" : "#856404",
  fontWeight: "bold",
  fontSize: "14px"
});
export default AdminDashboard;