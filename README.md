# Local Crisis HelpChain

Local Crisis HelpChain is a MERN stack based crisis management platform that connects citizens, NGOs, volunteers, and administrators to coordinate help efficiently during emergencies.

## Problem Statement
During crises, communication gaps delay help delivery. This platform centralizes requests and connects affected individuals with NGOs and volunteers in real time.

## Features

### User
- Register and login
- Raise crisis requests
- Track request status
- View nearby help providers

### NGO
- Manage crisis requests
- Assign volunteers
- Update request progress

### Volunteer
- Accept assigned requests
- Update assistance status

### Admin
- Verify NGOs and volunteers
- Manage users and requests
- Monitor platform activity

## Tech Stack
- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB
- Authentication: JWT
- Real-time updates: Socket.io

## System Architecture
Client (React) communicates with Express backend APIs, which interact with MongoDB database. Socket.io enables real-time request updates.

## Authentication & Role Access
JWT authentication ensures secure login. Role-based access controls dashboards and actions for User, NGO, Volunteer, and Admin.

## Setup Instructions

### Backend Setup
```bash
cd server
npm install
npm start
