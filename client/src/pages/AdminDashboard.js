import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../components/admin/AdminLayout"; // ✅ correct path

const AdminDashboard = () => {
  const [allNgos, setAllNgos] = useState([]);
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [volSearch, setVolSearch] = useState("");
  const [volStatusFilter, setVolStatusFilter] = useState("all");

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  
  /* ================= FETCH FUNCTIONS ================= */

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/admin/all-users`,
        { headers: { Authorization: `Bearer ${token}` } }
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
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNgos(res.data.ngos);
      setVolunteers(res.data.volunteers);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.clear();
        navigate("/login", { replace: true });
      }
    }
  };

  /* ================= ACTIONS ================= */

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

  /* ================= EFFECT ================= */

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetchAllUsers();
    fetchPending();
  }, [token]);

  /* ================= FILTER LOGIC ================= */

  const filteredNgos = allNgos.filter((ngo) => {
    const name = ngo.name?.toLowerCase() || "";
    const email = ngo.email?.toLowerCase() || "";

    const matchesSearch =
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "approved" && ngo.verified) ||
      (statusFilter === "pending" && !ngo.verified);

    return matchesSearch && matchesStatus;
  });

  const filteredVolunteers = allVolunteers.filter((vol) => {
    const name = vol.name?.toLowerCase() || "";
    const email = vol.email?.toLowerCase() || "";

    const matchesSearch =
      name.includes(volSearch.toLowerCase()) ||
      email.includes(volSearch.toLowerCase());

    const matchesStatus =
      volStatusFilter === "all" ||
      (volStatusFilter === "approved" && vol.verified) ||
      (volStatusFilter === "pending" && !vol.verified);

    return matchesSearch && matchesStatus;
  });



  /* ================= UI ================= */

  return (
    <AdminLayout handleLogout={handleLogout}>
      {/* Stats */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div style={statsCard}>
          <h4>Pending NGOs</h4>
          <p style={statsNumber}>{ngos.length}</p>
        </div>
        <div style={statsCard}>
          <h4>Pending Volunteers</h4>
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

<div style={filterContainer}>
  <input
    style={inputStyle}
    type="text"
    placeholder="Search NGOs..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  <select
    style={inputStyle}
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
      <th style={thStyle}>Name</th>
      <th style={thStyle}>Email</th>
      <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
    </tr>
  </thead>
  <tbody>
    {filteredNgos.length === 0 ? (
      <tr>
        <td colSpan="3" style={emptyStyle}>
          No NGOs found
        </td>
      </tr>
    ) : (
      filteredNgos.map((ngo) => (
        <tr key={ngo._id} style={rowStyle}>
          <td style={tdStyle}>{ngo.name}</td>
          <td style={tdStyle}>{ngo.email}</td>
          <td style={{ ...tdStyle, textAlign: "center" }}>
            <span style={badgeStyle(ngo.verified)}>
              {ngo.verified ? "Approved" : "Pending"}
            </span>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>

{/* ================= ALL VOLUNTEERS ================= */}
<h2 style={{ marginTop: "60px" }}>All Volunteers</h2>

<div style={filterContainer}>
  <input
    style={inputStyle}
    type="text"
    placeholder="Search Volunteers..."
    value={volSearch}
    onChange={(e) => setVolSearch(e.target.value)}
  />
  <select
    style={inputStyle}
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
      <th style={thStyle}>Name</th>
      <th style={thStyle}>Email</th>
      <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
    </tr>
  </thead>
  <tbody>
    {filteredVolunteers.length === 0 ? (
      <tr>
        <td colSpan="3" style={emptyStyle}>
          No Volunteers found
        </td>
      </tr>
    ) : (
      filteredVolunteers.map((vol) => (
        <tr key={vol._id} style={rowStyle}>
          <td style={tdStyle}>{vol.name}</td>
          <td style={tdStyle}>{vol.email}</td>
          <td style={{ ...tdStyle, textAlign: "center" }}>
            <span style={badgeStyle(vol.verified)}>
              {vol.verified ? "Approved" : "Pending"}
            </span>
          </td>
        </tr>
      ))
    )}
  </tbody>
</table>
    </AdminLayout>
  );
};

/* ===== Styles ===== */

const cardStyle = {
  backgroundColor: "#fff",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "8px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
};

const approveBtn = {
  backgroundColor: "#16a34a",
  color: "#fff",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  marginRight: "10px"
};

const rejectBtn = {
  backgroundColor: "#dc2626",
  color: "#fff",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px"
};

const statsCard = {
  flex: 1,
  padding: "20px",
  background: "#fff",
  borderRadius: "12px",
  textAlign: "center",
  boxShadow: "0 4px 8px rgba(0,0,0,0.05)"
};

const statsNumber = {
  fontSize: "26px",
  fontWeight: "bold"
};

const filterContainer = {
  display: "flex",
  gap: "15px",
  marginBottom: "20px",
  alignItems: "center",
};

const inputStyle = {
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 14px",
};

const thStyle = {
  textAlign: "left",
  padding: "12px 20px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#374151",
};

const rowStyle = {
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 10px rgba(0,0,0,0.04)",
  borderRadius: "12px",
};


const tdStyle = {
  padding: "16px 20px",
  fontSize: "14px",
  color: "#111827",
};

const emptyStyle = {
  textAlign: "center",
  padding: "30px",
  color: "#6b7280",
};

const badgeStyle = (verified) => ({
  display: "inline-block",
  padding: "6px 16px",
  borderRadius: "999px",
  backgroundColor: verified ? "#dcfce7" : "#fef3c7",
  color: verified ? "#166534" : "#92400e",
  fontWeight: "600",
  fontSize: "13px",
});
export default AdminDashboard;