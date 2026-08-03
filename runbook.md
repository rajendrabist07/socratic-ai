# 📘 SocraticAI Operations & Incident Runbook

This document details the incident response, rollback, backup, and health-check verification procedures for SocraticAI in production.

---

## 🚨 Incident 1: Bad Deployment Shipped to Production

If a deployment contains breaking logic, memory leaks, or crashes on runtime endpoints:

### 1. Instant Vercel Rollback (Under 1 Minute)
*   **Via Vercel Web Console:**
    1. Go to the [Vercel Dashboard](https://vercel.com).
    2. Click on the `socratic-ai` project.
    3. Navigate to the **Deployments** tab.
    4. Find the **previous stable deployment** (the last one known to be working).
    5. Click the three dots (`...`) on the right of the deployment row and select **Rollback**.
    6. Confirm the rollback. Vercel will instantly route 100% of production traffic to that build's static assets and serverless lambdas.
*   **Via Vercel CLI:**
    ```bash
    # Promotes a specific deployment ID back to production instantly
    vercel promote <deployment-id>
    ```

### 2. Diagnosis and Fix
*   Navigate to Vercel Project -> **Logs** to retrieve error traces.
*   Search for `"level":"error"` inside logs.
*   Once fixed, push the corrective commit to the `main` branch to trigger a standard deployment.

---

## 💾 Incident 2: Database Corruption or Deletion

### 1. Paid Cluster (M10+) Automated Snapshot Restoration
1. Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Go to **Database** and locate your cluster.
3. Click the **Backup** tab in the sidebar.
4. Select the snapshot version (Atlas takes daily snapshots with standard retention rules).
5. Click **Restore**, choose the target database, and verify restoration settings.

### 2. Free Tier (M0) Manual CLI Backups & Restoration
*Because MongoDB Atlas Free Tier does not support automated backups, maintain manual snap dumps before running migrations:*
*   **Create a Backup Dump:**
    ```bash
    # Dumps database structure and records to local directory
    mongodump --uri="mongodb+srv://<username>:<password>@<host>/socratic_ai" --out="./backup-dumps/$(date +%F)"
    ```
*   **Restore a Dump:**
    ```bash
    # Restores all collections from a specific snapshot dump
    mongorestore --uri="mongodb+srv://<username>:<password>@<host>/socratic_ai" --drop "./backup-dumps/<folder-date>/socratic_ai"
    ```

---

## ☁️ Incident 3: Groq AI or Clerk Auth Outages

### 1. Groq Outage
*   **Symptom:** AI chat streaming returns a 500 error, and the client displays `AI service temporarily unavailable. Please try again.`
*   **Check Status:** Visit [status.groq.com](https://status.groq.com).
*   **Mitigation:** The system handles failures gracefully via tRPC friendly error mappings, logging the exact duration and status code for analytics.

### 2. Clerk Outage
*   **Symptom:** Users are redirected to Clerk login pages, or local auth middleware fails to parse JWT tokens.
*   **Check Status:** Visit [status.clerk.com](https://status.clerk.com).
*   **Mitigation:** SocraticAI uses stateless JWT verification. If Clerk's token servers are healthy, active user sessions will remain authorized even if Clerk's management dashboards are down.

---

## 🩺 System Health Monitoring

### Health Check Endpoint
Uptime monitors (such as UptimeRobot or Better Uptime) should ping:
`https://socratic-ai-tau.vercel.app/api/health`

**Expected Success Payload (HTTP 200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-08-03T10:00:00.000Z",
  "database": "connected",
  "groq": "configured"
}
```

If the database is unreachable or env keys are missing, the route will return **HTTP 503** with detailed error fields.
