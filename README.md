# AtomGoal 🎯

**Enterprise Goal Setting & Performance Tracking Portal**

AtomGoal is a comprehensive, production-ready enterprise SaaS platform designed to streamline goal management, performance tracking, and OKR (Objectives and Key Results) workflows. Built with a modern tech stack, it provides role-based access for Employees, Managers, and Admins to ensure aligned objectives, seamless approvals, and robust analytics.

## 🚀 Key Features

* **Role-Based Workflows**: Dedicated dashboards and permissions for Employees, Managers, and Administrators.
* **Goal Management Lifecycle**: Complete CRUD capabilities for goals with strict weightage validation and quarterly check-ins.
* **Realtime Approvals**: Seamless workflow engine for managers to review, approve, or reject employee goals.
* **Analytics & Insights**: Deep performance metrics, completion trends, and manager effectiveness dashboards.
* **Audit Trails & Compliance**: Full historical tracking of all goal modifications and approval states.
* **Enterprise Robustness**: Offline fallback, optimistic UI updates, strict RBAC via Firestore Security Rules, and comprehensive error handling.

## 🛠 Tech Stack

* **Frontend**: React, TypeScript, Vite
* **Styling & UI**: Tailwind CSS, ShadCN UI
* **Backend & Database**: Firebase (Auth, Cloud Firestore)
* **Architecture**: N-tier modular services (Auth, Goal, Audit, Notification, Analytics, Validation)

## 📖 Documentation

* [Architecture Overview](./architecture.md) - Deep dive into the system design, data flow, and infrastructure.

## 🏃‍♂️ Getting Started

### Prerequisites

* Node.js (v18+)
* Firebase project with Firestore and Authentication (Email/Password) enabled.

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on your Firebase configuration.
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check issues page.
