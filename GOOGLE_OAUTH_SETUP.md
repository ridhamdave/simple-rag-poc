# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for your RAG system.

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" 
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the consent screen if prompted:
   - Choose "External" user type
   - Fill in the required fields (App name, User support email, etc.)
   - Add your email to test users
4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Name: "RAG System"
   - Authorized redirect URIs: 
     - `http://localhost:5001/api/auth/google/callback` (development)
     - `https://yourdomain.com/api/auth/google/callback` (production)

## Step 3: Update Environment Variables

1. Copy your Client ID and Client Secret from the Google Console
2. Update your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here

# JWT Secret (generate a secure random string)
JWT_SECRET=your_secure_jwt_secret_here

# Session Secret (generate a secure random string)
SESSION_SECRET=your_secure_session_secret_here

# MongoDB URI (if using local MongoDB)
MONGODB_URI=mongodb://localhost:27017/rag-system
```

## Step 4: Install and Start MongoDB

### Option 1: Local MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu
sudo apt install mongodb
sudo systemctl start mongodb
```

### Option 2: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

## Step 5: Generate Secure Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate Session secret  
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 6: Test the Setup

1. Start your backend server:
   ```bash
   npm run server
   ```

2. Start your frontend:
   ```bash
   npm run client
   ```

3. Visit `http://localhost:3000`
4. Click "Sign in with Google"
5. You should be redirected to Google's OAuth flow

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Make sure your redirect URI in Google Console exactly matches your server URL
   - Check that your server is running on the correct port (5001)

2. **"invalid_client" error**
   - Verify your Client ID and Client Secret are correct
   - Make sure there are no extra spaces in your `.env` file

3. **MongoDB connection error**
   - Ensure MongoDB is running
   - Check your connection string format
   - Verify database permissions

4. **CORS errors**
   - Make sure your frontend is running on port 3000
   - Check CORS configuration in `server/index.js`

## Security Notes

- Keep your Client Secret secure and never commit it to version control
- Use strong, random JWT and session secrets
- In production, use HTTPS for all OAuth redirects
- Consider using environment-specific OAuth apps (dev, staging, prod)

## Next Steps

Once authentication is working:
1. Test user registration and login
2. Verify JWT tokens are working
3. Check that user profiles are being created in MongoDB
4. Move on to implementing chat persistence (Phase 2)
