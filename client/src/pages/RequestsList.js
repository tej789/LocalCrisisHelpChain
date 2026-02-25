import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
const RequestsList = () => {
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
const { user } = useAuth();
useEffect(() => {
  const fetchRequests = async () => {
    try {
      const res = await api.get("/api/requests?limit=100");

      let list = [];

      // 👤 USER response structure
      if (res.data.myRequests || res.data.communityRequests) {
        list = [
          ...(res.data.myRequests || []),
          ...(res.data.communityRequests || [])
        ];
      }
      // 👑 NGO / ADMIN response structure
      else if (res.data.data) {
        list = res.data.data;
      }

      console.log("Final list:", list);

      setRequests(list);
      setFiltered(list);

      
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  fetchRequests();
}, []);

  useEffect(() => {
    let data = [...requests];

    if (search) {
      data = data.filter(
        (r) =>
          r.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.type?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter) {
      data = data.filter((r) => r.status === statusFilter);
    }

    setFiltered(data);
  }, [search, statusFilter, requests]);

  const getStatusStyle = (status) => {
    const styles = {
      open: { background: "#fee2e2", color: "#b91c1c" },
      assigned: { background: "#dbeafe", color: "#1d4ed8" },
      resolved: { background: "#dcfce7", color: "#166534" },
    };
    return styles[status] || {};
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>All Help Requests</h1>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 15,
        }}
      >
        <input
          placeholder="Search name or type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <div style={tableContainer}>
          <table style={tableStyle}>
            <thead>
              <tr style={headerRow}>
                <th style={th}>Name</th>
{user?.role !== "user" && <th style={th}>Contact</th>}                <th style={th}>Type</th>
                <th style={th}>Urgency</th>
                <th style={th}>Description</th>
                <th style={th}>Status</th>
                <th style={th}>Location</th>
              </tr>
            </thead>

            <tbody>
              {(Array.isArray(filtered) ? filtered : []).map((req, index) => (
                <tr
                  key={req._id}
                  style={{
                    background: index % 2 === 0 ? "#fafafa" : "#fff",
                  }}
                >
                  <td style={td}>{req.name}</td>
{user?.role !== "user" && (
  <td style={td}>{req.contact}</td>
)}                  <td style={td}>{req.type}</td>
                  <td style={td}>{req.urgency}</td>
                  <td style={td}>{req.description}</td>
                  <td style={td}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        ...getStatusStyle(req.status),
                      }}
                    >
                      {req.status}
                    </span>
                  </td>
                  <td style={td}>
                    {req.location?.address ||
                      (req.location?.coordinates
                        ? `${req.location.coordinates[1]}, ${req.location.coordinates[0]}`
                        : "N/A")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ---------- styles ---------- */

const inputStyle = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  minWidth: 200,
  flex: 1,
};

const tableContainer = {
  overflowX: "auto",
  background: "#fff",
  borderRadius: 12,
  padding: 10,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 700,
};

const headerRow = {
  background: "#f3f4f6",
  textAlign: "left",
};

const th = {
  padding: 12,
  fontWeight: 600,
};

const td = {
  padding: 12,
  borderBottom: "1px solid #eee",
};

export default RequestsList;
