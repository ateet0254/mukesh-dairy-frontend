# Milk Dairy Management System

A full-stack web application for managing daily milk entries, customer payments, and generating weekly reports for a local milk dairy business.

## Features

* **Secure Authentication**: Admin login for authorized access.
* **Customer Management**: Add, view, edit, and search customer records.
* **Daily Entries**: Record and manage morning and evening milk entries with details like FAT, SNF, rate, and amount.
* **Payments & Transactions**: Record and track customer payments.
* **Data Reporting**: Generate and download weekly milk reports for individual customers.
* **Performance & UI**: Fast, responsive interface with animations and smooth data loading.

## Technologies Used

* **Frontend**: React (Vite), Tailwind CSS, Framer Motion
* **Backend**: Node.js, Express.js
* **Database**: PostgreSQL (Supabase)
* **ORM**: Prisma
* **Hosting**: Vercel(Frontend), Render (Backend)


## Local Setup

Follow these steps to set up the project on your local machine:

**1. Clone the repository**
```bash
git clone [your_github_repo_url]
cd [your_project_folder]


2. Configure the Backend
    Navigate to the backend directory: cd backend
    Install dependencies: npm install
    Create a .env file and add your Supabase database URL. Replace [YOUR_PASSWORD] with your actual password.
    Code snippet
    DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.abzonwusjazjmezbdzma.supabase.co:5432/postgres?sslmode=require"
    PORT=4000
    ADMIN_USERNAME="your_admin_username"
    ADMIN_PASSWORD="your_admin_password"

    Run Prisma migrations to set up the database tables:
        npx prisma migrate dev --name init
    Seed the database with an admin user:
        Seed the database with an admin user:

Configure the Frontend
    Navigate to the frontend directory: cd frontend
    Install dependencies: npm install
    Create a .env file for the frontend and add the backend API URL:

    VITE_API_URL=http://localhost:4000

Run the frontend application:
    npm run dev

Start the Backend
    npm run dev

The application will be accessible at http://localhost:5173.