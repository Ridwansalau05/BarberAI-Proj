BarberAI

AI-Powered Barber Management & Recommendation System

Project Description

BarberAI is a web-based barber management and haircut recommendation system designed to modernize how barbershops manage appointments and personalize customer experiences.

The primary goal of this project is to replace informal scheduling methods (walk-ins, text messages, verbal bookings) with a structured digital workflow. The system allows:

Customers to create accounts, book appointments, explore personalized haircut suggestions, and track their haircut history.

Barbers to manage their daily schedule, monitor upcoming appointments, and view performance insights.

This project is being developed as part of CSCI 411/412.
The current semester focuses on completing the full frontend workflow (navigation, dashboards, booking system, and authentication flow). Firebase Authentication and Firestore integration are being progressively refined for persistent data storage and real user sessions.

Technologies Used
Frontend

React (Vite)

React Router DOM

Tailwind CSS

Lucide React Icons

Forms & Validation

React Hook Form

Zod (schema validation)

Backend Services

Firebase Authentication

Firebase Firestore (for user profiles and booking storage)

Development Tools

Node.js

npm

Git & GitHub

Setup Instructions
1. Clone the Repository
git clone https://github.com/YOUR_USERNAME/barber-ai.git
cd barber-ai
2. Install Dependencies
npm install
3. Configure Environment Variables

Create a .env file in the root directory and add your Firebase configuration:

VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

Make sure your Firebase project has:

Authentication enabled (Email/Password)

Firestore database created

How to Run the Project

Start the development server:

npm run dev

The app will run at:

http://localhost:5173
