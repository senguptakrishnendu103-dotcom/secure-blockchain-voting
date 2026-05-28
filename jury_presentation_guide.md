# SecureVote: Email OTP & Live Deployment Technical Report
This document provides a detailed technical breakdown of the challenges faced during the configuration of the 2-Factor Authentication (2FA) OTP system, how we resolved them, and a comprehensive list of jury questions ranging from basic to advanced levels.

---

## 1. Project Architecture (Email & 2FA Flow)
To secure the voting process, the platform enforces a **2-Factor Authentication (2FA)** step prior to writing the vote to the Ethereum blockchain:
1. **User Input:** The voter registers with their real personal Gmail address.
2. **Action Trigger:** When a logged-in voter casts a vote, they perform a biometric face scan, which triggers a request to the `/api/send-otp` backend API endpoint.
3. **Backend Logic:** The Node.js/Express server generates a random 6-digit cryptographic OTP, stores it in a temporary local map (`otpStore`) with a 5-minute expiration window, and sends it to the voter's registered email address.
4. **Verification & Execution:** The voter enters the OTP. If valid, the backend invokes the smart contract's `voteByAdmin` function (gasless voting sponsored by the Admin wallet) and records the vote on-chain.

---

## 2. Problems Faced & Solutions Implemented

### Problem 1: Default Gmail SMTP Credentials Blocked
* **Symptoms:** The website showed "OTP Sent (Demo Mode)" but no email arrived in the inbox.
* **Root Cause:** The codebase originally relied on default hardcoded Gmail credentials (`dreamysoul719@gmail.com` with a legacy App Password). Google blocked SMTP access because the account was accessed from unrecognized cloud hosting IPs (Render), or the credentials expired.
* **Solution:** We transitioned to generating a dedicated **Google App Password** for the administrator's account under 2-Step Verification and configured `EMAIL_USER` and `EMAIL_PASS` in the environment variables.

### Problem 2: Resend API Sandbox Restrictions
* **Symptoms:** The logs showed `Resend API Error: 403 Forbidden`. The API rejected sending emails to newly registered voter addresses.
* **Root Cause:** The server environment was configured to use the Resend API. However, on Resend's free tier sandbox using the default domain (`onboarding@resend.dev`), emails are **strictly restricted** to the email address of the account owner. You cannot send emails to any external voter.
* **Solution:** We deleted the `RESEND_API_KEY` from the Render environment variables to bypass the Resend code block and fall back to Gmail SMTP.

### Problem 3: Render Outbound SMTP Port Blocks (`ETIMEDOUT` / `ENETUNREACH`)
* **Symptoms:** The server logs showed connection timeouts: `Email Error: Error: connect ETIMEDOUT` or `ENETUNREACH` on port `465` (secure SMTP).
* **Root Cause:** Modern cloud application hosting platforms (such as Render's Free Tier, AWS, and Heroku) **strictly block outgoing traffic on ports 25, 465, and 587** to prevent their servers from being used to send mass spam. Additionally, Render had trouble resolving Google's SMTP servers over IPv6 networks.
* **Solution:** We bypassed SMTP entirely by integrating an **HTTP-based Email API (Brevo)**. HTTP APIs run on standard web port `443` (HTTPS) which is never blocked by firewalls. We modified the backend code `server/index.cjs` to use Brevo's REST API endpoint: `https://api.brevo.com/v3/smtp/email`.

### Problem 4: Brevo Account Activation
* **Symptoms:** The server logged: `Brevo API Error: {"message":"Unable to send email. Your SMTP account is not yet activated..."}`
* **Root Cause:** Brevo blocks API sending for new accounts until the user completes their business profile.
* **Solution:** We navigated the Brevo dashboard to fill in the organization details, checked "I don't have a website" to bypass domain checks, and activated the transactional email service.

---

## 3. Jury Q&A Prep Guide

### Category A: Basic Level Questions
These questions test your understanding of the elementary mechanics of the system.

#### Q1: What is nodemailer and why did you use it?
> **Answer:** Nodemailer is a Node.js module that allows applications to send emails. We initially used it because it makes sending emails via SMTP (like Gmail) extremely simple with a few lines of JavaScript.

#### Q2: How does the system generate the 6-digit OTP code?
> **Answer:** The backend uses standard pseudorandom generation:
> `Math.floor(100000 + Math.random() * 900000).toString();`
> This generates a random string between `100000` and `999999`.

#### Q3: Where is the OTP stored between generation and verification?
> **Answer:** It is stored in memory on the backend server inside a JavaScript `Map` object called `otpStore`. The key is the voter's email, and the value is an object containing the OTP code and an expiration timestamp (set to 5 minutes from generation).

---

### Category B: Intermediate Level Questions
These questions assess your network configuration and integration skills.

#### Q4: Why did standard SMTP (Gmail SMTP) fail when deployed on Render?
> **Answer:** Most cloud platforms (Render, Heroku, AWS EC2) block outgoing TCP traffic on port 25, 465, and 587 by default. This is an industry-standard practice to prevent cloud servers from being used to send mass spam. Because of this block, the server failed to open a socket to `smtp.gmail.com:465`, resulting in a `Connection timeout` error.

#### Q5: How did switching to the Brevo API solve the Render port-blocking problem?
> **Answer:** Standard SMTP requires connecting to custom mail ports (465/587). The Brevo API uses standard HTTP POST requests over **Port 443 (HTTPS)**. Since Port 443 is the standard port for all encrypted web traffic, it is never blocked by cloud firewalls.

#### Q6: Why did you have to delete the Resend API Key?
> **Answer:** The backend was programmed to prioritize Resend if an API key was found. However, Resend's free tier restricts sending emails only to the account owner unless you link and verify a paid custom domain. Deleting the key allowed the backend code to execute our custom email routing logic.

---

### Category C: Advanced / Professional Level Questions
These questions are typical of what experienced software engineers or blockchain architects will ask.

#### Q7: Storing OTPs in a local in-memory `Map` is fine for development, but why is it a bad practice in a production system, and how would you fix it?
> **Answer:** 
> * **Problem:** In-memory storage is not stateless. If the Render container restarts, crashes, or scales horizontally to multiple instances (load balancing), the active OTPs are lost or cannot be shared across server instances.
> * **Fix:** In a production system, we would offload the OTP storage to a fast, temporary data store like **Redis** with a built-in TTL (Time-To-Live) expiration.

#### Q8: How does your OTP system prevent replay attacks or brute-force attacks?
> **Answer:** 
> 1. **Replay Prevention:** The OTP is deleted from the `otpStore` the moment it is verified (regardless of whether the verification succeeds or fails). This ensures a code cannot be reused.
> 2. **Brute Force Defense:** The code has a strict 5-minute expiration time. In production, we would add rate-limiting middleware (like `express-rate-limit`) to block IP addresses making more than 3 failed verification attempts.

#### Q9: If a malicious voter inspects their network tab, can they bypass the OTP check and directly invoke the smart contract to cast a vote?
> **Answer:** No. The smart contract's voting function is executed **gaslessly** via an Admin Relayer wallet on the backend. The contract only accepts transactions signed by the designated admin wallet (`voteByAdmin`). Because the private key of the admin wallet is kept securely on the backend, a regular user has no way of calling this contract directly without the backend verifying the OTP first.

#### Q10: How does the deterministic wallet derivation work in your application?
> **Answer:** Instead of forcing users to sign in with MetaMask, we generate a unique cryptographic wallet address for them on the fly. We take their unique `Voter ID` (EPIC number), combine it with a secret backend salt string, hash it using `keccak256`, and use that hash as entropy to instantiate an `ethers.Wallet` instance:
> `const entropy = ethers.keccak256(ethers.toUtf8Bytes(voterId + salt));`
> This ensures that each voter gets a fixed, secure, unique blockchain address without needing any crypto wallet software.
