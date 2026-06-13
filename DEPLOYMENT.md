# 🚀 SyncTalk — Render Deployment Guide

SyncTalk is a full-stack real-time application using **Express**, **Socket.IO (WebSockets)**, **Mongoose (MongoDB)**, and **Redis**.

This guide explains how to deploy SyncTalk to **Render** using Render Blueprints (Infrastructure-as-Code). Using this method, Render will automatically provision both the Redis instance and the Web Service for you in one click.

---

## 🛠️ Step 1: Push Code to GitHub

*(You have already completed this step! Your code is live on GitHub at `https://github.com/subhankarkr/SyncTalk.git`)*.

---

## 🛠️ Step 2: Get a MongoDB Connection String

Render requires a cloud database to store your encrypted logs.
1. Sign up or log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Click **Create** to deploy a new database. Select the **M0 (Free)** Shared Tier cluster.
3. Once created, go to **Security** -> **Database Access** -> **Add New Database User**:
   * Create a username (e.g., `db_user`).
   * Generate a password (save this password).
   * Ensure user privilege is set to `Read and write to any database`.
4. Go to **Security** -> **Network Access** -> **Add IP Address**:
   * Click **Allow Access from Anywhere** (adds `0.0.0.0/0`). This is necessary so Render's cloud servers can connect. Click **Confirm**.
5. Go to **Deployment** -> **Database** and click **Connect**:
   * Choose **Drivers** under *Connect to your application*.
   * Copy the connection string. It will look like this:
     `mongodb+srv://db_user:<password>@cluster0.xxxx.mongodb.net/?retryWrites=true&w=majority`
   * Replace `<password>` with your database user password.

---

## 🚀 Step 3: Deploy via Render Blueprints

Render will read the `render.yaml` file in your repository to set up everything automatically.

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** (top right) and select **Blueprint**.
3. Connect your GitHub repository (`subhankarkr/SyncTalk`).
4. Give your Blueprint group a name (e.g. `synctalk-stack`).
5. Render will automatically detect the configuration:
   * It will create a **Redis** database instance (`synctalk-redis`).
   * It will create a **Web Service** (`synctalk`).
6. You will see a placeholder prompt for **`MONGODB_URI`**:
   * Paste your MongoDB connection string (from Step 2.5) into this field.
7. Click **Apply**.

Render will automatically link the Redis connection to your web service, install dependencies, compile the client, and deploy your live app!
