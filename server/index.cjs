const express = require('express');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const nodemailer = require('nodemailer');
const { ethers } = require('ethers');

// Load environment variables explicitly
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Load Voting smart contract ABI
const VotingArtifact = require('../src/artifacts/contracts/Voting.sol/Voting.json');

const otpStore = new Map();

// Configure Nodemailer for Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'dreamysoul719@gmail.com',
    pass: process.env.EMAIL_PASS || 'iiwxlzdfvjjgtphl'
  }
});

// Helper function to send email via Resend API (HTTP) if key is set, otherwise fallback to SMTP
const sendMailHelper = async ({ to, subject, html }) => {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'SecureVote <onboarding@resend.dev>',
        to: to,
        subject: subject,
        html: html
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API Error: ${errText}`);
    }
    return { success: true };
  } else {
    return transporter.sendMail({
      from: `"SecureVote Portal" <${process.env.EMAIL_USER || 'dreamysoul719@gmail.com'}>`,
      to: to,
      subject: subject,
      html: html
    });
  }
};

// Derive voter address deterministically from their unique Voter ID
const getVoterAddress = (voterId) => {
  const entropy = ethers.keccak256(ethers.toUtf8Bytes(voterId.toLowerCase() + "secure_voting_salt_2026"));
  const wallet = new ethers.Wallet(entropy);
  return wallet.address;
};

// Connect to the Voting smart contract using the admin wallet (which sponsors gas)
const getAdminContract = () => {
  const rpcUrl = (process.env.SEPOLIA_RPC_URL || process.env.VITE_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com').trim();
  const privateKey = process.env.PRIVATE_KEY.trim();
  const contractAddress = (process.env.VITE_CONTRACT_ADDRESS || '0xA033b7a4d0A2713254742945381D921F37DDf000').trim();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, VotingArtifact.abi, wallet);
};

const app = express();
app.use(cors());
app.use(express.json());

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize Database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    studentId TEXT UNIQUE,
    dept TEXT,
    aadhaar TEXT,
    password TEXT,
    walletIndex INTEGER
  )`);

  // Check if admin exists
  db.get("SELECT * FROM users WHERE studentId = 'admin'", (err, row) => {
    if (!row) {
      const hashedAdminPass = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO users (name, studentId, dept, aadhaar, password, walletIndex) VALUES (?, ?, ?, ?, ?, ?)",
        ['Election Officer', 'admin', 'Administration', '0000-0000-0000', hashedAdminPass, 0]);
    }
  });
});

// Register Endpoint
app.post('/api/register', (req, res) => {
  const { name, studentId, dept, aadhaar, password } = req.body;
  
  // Find next available wallet index (1 to 19 for students)
  db.get("SELECT MAX(walletIndex) as lastIndex FROM users WHERE studentId != 'admin'", (err, row) => {
    const nextIndex = (row.lastIndex || 0) + 1;
    
    if (nextIndex >= 20) {
      return res.status(400).json({ error: 'Maximum registration limit reached for demo.' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    db.run("INSERT INTO users (name, studentId, dept, aadhaar, password, walletIndex) VALUES (?, ?, ?, ?, ?, ?)",
      [name, studentId, dept, aadhaar, hashedPassword, nextIndex],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Student ID already registered.' });
          }
          return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ success: true, message: 'User registered successfully.' });
      }
    );
  });
});

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { userId, password, type } = req.body;

  db.get("SELECT * FROM users WHERE studentId = ?", [userId], (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const validPass = bcrypt.compareSync(password, user.password);
    if (!validPass) {
      return res.status(400).json({ error: 'Invalid password.' });
    }

    // Check if logging in as correct type
    if (type === 'admin' && user.studentId !== 'admin') {
      return res.status(400).json({ error: 'Access denied. Not an admin.' });
    }

    res.json({
      success: true,
      user: {
        name: user.name,
        studentId: user.studentId,
        dept: user.dept,
        aadhaar: user.aadhaar,
        walletIndex: user.walletIndex,
        role: user.studentId === 'admin' ? 'admin' : 'voter'
      }
    });
  });
});

// Send OTP Endpoint
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { code: otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    await sendMailHelper({
      to: email,
      subject: 'Your SecureVote Secret Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h2>Your Voting Secret Code</h2>
          <p>Please enter the following 6-digit code to authorize your vote transaction.</p>
          <div style="font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 10px; margin: 20px auto; width: fit-content; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="color: #666; font-size: 12px;">This code expires in 5 minutes.</p>
        </div>
      `
    });
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Email Error:', error);
    // Fallback for demo if credentials aren't set
    console.log(`[DEMO MODE] OTP for ${email} is: ${otp}`);
    res.json({ success: true, message: 'OTP sent (Demo mode: check console)' });
  }
});

// Verify OTP Endpoint (Supports optional gasless vote submission)
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp, candidateId, voterId } = req.body;
  const stored = otpStore.get(email);

  if (!stored) return res.status(400).json({ error: 'No OTP requested for this email.' });
  if (Date.now() > stored.expires) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP expired.' });
  }
  if (stored.code !== otp) return res.status(400).json({ error: 'Invalid secret code.' });

  // If candidateId and voterId are supplied, submit the vote to the blockchain gaslessly
  if (candidateId !== undefined && voterId) {
    try {
      const voterAddress = getVoterAddress(voterId);
      const contract = getAdminContract();
      
      // Submit transaction signed by Admin wallet
      const tx = await contract.voteByAdmin(candidateId, voterAddress);
      const receipt = await tx.wait();
      
      otpStore.delete(email);
      return res.json({ 
        success: true, 
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        voterAddress: voterAddress
      });
    } catch (error) {
      console.error('Relayed Vote Error:', error);
      let errorMsg = 'Failed to submit vote to blockchain.';
      if (error.message.includes('Voter has already voted') || error.message.includes('already cast')) {
        errorMsg = 'You have already cast a vote.';
      } else if (error.message.includes('not started')) {
        errorMsg = 'Election polling has not started yet.';
      } else if (error.message.includes('ended')) {
        errorMsg = 'Election polling has concluded.';
      }
      return res.status(500).json({ error: errorMsg });
    }
  }

  otpStore.delete(email);
  res.json({ success: true });
});

// Send Vote Confirmation Email
app.post('/api/send-confirmation', async (req, res) => {
  const { email, name, epicId, aadhaar, txHash } = req.body;

  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    await sendMailHelper({
      to: email,
      subject: '✅ Your Vote is Confirmed (Blockchain Receipt)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #4F46E5;">SecureVote Confirmation Receipt</h2>
            <p style="color: #666;">Your vote has been securely recorded on the blockchain.</p>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Voter Details</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>EPIC ID:</strong> ${epicId}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Aadhaar:</strong> ${epicId}</p>
          </div>

          <div style="background: #eff6ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px;">Cryptographic Proof</h3>
            <p style="margin: 5px 0; font-size: 12px; color: #475569;">Transaction Hash:</p>
            <p style="margin: 5px 0; font-family: monospace; font-size: 12px; background: #e0e7ff; padding: 8px; border-radius: 4px; word-break: break-all;">
              ${txHash}
            </p>
            <p style="margin-top: 10px; font-size: 12px; color: #64748b;">You can use this hash to verify your vote independently on the public ledger.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8;">This is an automated receipt from the SecureVote Decentralized System.</p>
          </div>
        </div>
      `
    });
    res.json({ success: true, message: 'Confirmation sent' });
  } catch (error) {
    console.error('Confirmation Email Error:', error);
    res.status(500).json({ error: 'Failed to send confirmation email' });
  }
});

// Request Password Reset Endpoint (Sent to Admin)
app.post('/api/request-password-reset', async (req, res) => {
  const { name, epicId, aadhaar } = req.body;

  try {
    await sendMailHelper({
      to: 'velvethorizon619432@gmail.com',
      subject: `🚨 Password Reset Request: ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #DC2626;">Password Reset Request</h2>
            <p style="color: #666;">A user has requested a password reset. Please verify their identity and reset their credentials in the Firebase Console.</p>
          </div>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #334155; font-size: 16px;">Requester Details</h3>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>EPIC ID:</strong> ${epicId}</p>
            <p style="margin: 5px 0; font-size: 14px;"><strong>Aadhaar:</strong> ${epicId}</p>
          </div>

          <div style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h3 style="margin-top: 0; color: #b45309; font-size: 16px;">Next Steps</h3>
            <p style="margin: 5px 0; font-size: 14px;">1. Go to Firebase Console.</p>
            <p style="margin: 5px 0; font-size: 14px;">2. Find the user by their fake email: <span style="font-family: monospace;">${epicId.toLowerCase()}@securevote.com</span></p>
            <p style="margin: 5px 0; font-size: 14px;">3. Click 'Reset Password' and set a temporary one.</p>
            <p style="margin: 5px 0; font-size: 14px;">4. Email the user back at their real email if needed.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8;">This is an automated request from the SecureVote Portal.</p>
          </div>
        </div>
      `
    });
    res.json({ success: true, message: 'Request sent to admin' });
  } catch (error) {
    console.error('Reset Request Email Error:', error);
    res.status(500).json({ error: 'Failed to send reset request' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
