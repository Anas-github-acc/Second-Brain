# AI Career Path Scenario Simulator

An AI-powered simulator designed to model, analyze, and expand career and life decisions. The system helps users map out complex, multi-stage choice trees and evaluate potential trajectories using a structured three-pass LLM pipeline.

## System Architecture

The project consists of two primary parts:

1. **Backend**: A FastAPI application that manages simulation state, interacts with PostgreSQL via SQLAlchemy, and runs multi-stage LLM chains via OpenRouter.
2. **Frontend**: A Next.js Web application built with React Flow for interactive graph visualization, Zustand for state management, and Tailwind CSS for interface styling.

## Three-Pass Simulation Pipeline

The simulator evaluates decisions in three distinct stages:

1. **Pass 1: Discovery Engine**: Receives the initial career or life decision prompt from the user, identifies key factors, and drafts clarifying questions to gather context.
2. **Pass 2: Graph Generation**: Processes the user's responses, reveals hidden trade-offs, computes analytical weights, and generates a structured scenario graph containing multiple paths.
3. **Pass 3: What-if Expansion & Action Plan**: Allows the user to select specific nodes on the path to ask "what-if" questions, expanding the scenario graph interactively. It also compiles the resulting insights into actionable plans.

## Project Structure

- `backend`: FastAPI server, database configuration, schemas, models, API routers, and LLM services.
- `frontend`: Next.js app, UI components, Zustand stores, and React Flow nodes/edges.

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and configure your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Set your PostgreSQL DATABASE_URL and OpenRouter OPENROUTER_API_KEY in the .env file.
4. Set up a virtual environment and install the required dependencies:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
5. Start the FastAPI development server:
   ```bash
   python main.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the backend API URL in .env.local:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the Next.js development server:
   ```bash
   npm run dev
   ```

## Development and Stack Details

- **Backend Stack**: Python, FastAPI, SQLAlchemy (Async), PostgreSQL, Alembic, HTTPX.
- **Frontend Stack**: Next.js (React), React Flow (@xyflow/react), Zustand, Tailwind CSS, Axios.
