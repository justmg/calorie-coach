# Calorie Coach - Voice-First Nutrition Tracking

Calorie Coach is a voice-first nutrition-logging service that helps users track their daily calorie intake through automated phone calls. Users simply speak what they ate, and the system automatically logs calories using AI-powered transcription and analysis.

## Features

- **Automated Daily Calls**: Scheduled calls within user-defined time windows
- **PIN-Based Authentication**: Secure access with personal PIN verification
- **Natural Voice Interaction**: Powered by ElevenLabs Conversational AI
- **Accurate Calorie Extraction**: OpenAI-powered nutrition analysis
- **Real-Time Dashboard**: View intake history, trends, and progress
- **Retry & Failover Handling**: Ensures reliable data capture

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Voice AI**: ElevenLabs Conversational AI (Agent ID: `agent_0101k1ew3xy0fw09wmgaawmqhetd`)
- **Telephony**: Twilio Voice API
- **Workflow Orchestration**: n8n (Docker, Queue-mode, Redis)
- **AI Processing**: OpenAI GPT-4o-mini
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth with OTP

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Accounts with:
  - Supabase
  - Twilio
  - ElevenLabs
  - OpenAI

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd calorie-coach
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_AGENT_ID` (already set to the correct agent)
- `OPENAI_API_KEY`

### 4. Set Up Supabase Database

1. Create a new Supabase project
2. Run the SQL schema from `supabase/schema.sql` in the SQL editor
3. Enable Phone Auth in Authentication settings

### 5. Configure Twilio

1. Purchase a phone number in Twilio
2. Set the webhook URL for incoming calls to: `https://your-domain.com/api/twilio/voice`

### 6. Start n8n Workflows

```bash
docker-compose up -d
```

Access n8n at `http://localhost:5678` (admin/password)

Import the workflows from the `n8n/workflows` directory:
1. Call Scheduler
2. Call Handler
3. ElevenLabs Handler
4. Transcript Processor

### 7. Run the Application

Development:
```bash
npm run dev
```
npm run dev
  Your app will be running on http://localhost:3000

  3. Start ngrok tunnel

  ngrok http 3000

  You'll see output like:
  Forwarding    https://abc123.ngrok.io -> http://localhost:3000

  4. Configure Twilio Webhook

  In your Twilio Console:
  1. Go to Phone Numbers → Manage → Active numbers
  2. Click on your phone number (+15852057071)
  3. Set the webhook URL to: https://abc123.ngrok.io/api/twilio/voice
  4. Set HTTP method to POST
  5. Save configuration

  5. Update Environment Variables

  Update your .env.local:
  # Replace with your ngrok URL
  NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io

  6. Update n8n Webhook URLs

  In your n8n workflows, you'll need to update the webhook URLs to use your ngrok domain:
  - https://abc123.ngrok.io/api/elevenlabs/webhook

  Testing the Flow

  1. Start all services:
  # Terminal 1: Start n8n
  docker-compose up -d

  # Terminal 2: Start Next.js
  npm run dev

  # Terminal 3: Start ngrok
  ngrok http 3000
  2. Import n8n workflows at http://localhost:5678 (admin/password)
  3. Test the call flow:
    - Sign up with your phone number
    - The system should schedule a call
    - You can manually trigger a call or wait for the scheduled time

  Important Notes

  - ngrok URLs change each time you restart ngrok (unless you have a paid plan)
  - You'll need to update Twilio webhook each time the ngrok URL changes
  - For consistent development, consider using a static ngrok domain (paid feature)
  - Make sure your firewall allows incoming connections on the ngrok tunnel

  The webhook URL structure will be:
  - Voice webhook: https://your-ngrok-url.ngrok.io/api/twilio/voice
  - ElevenLabs webhook: https://your-ngrok-url.ngrok.io/api/elevenlabs/webhook

Production:
```bash
npm run build
npm run start
```

## Usage

1. **Sign Up**: Create an account with your phone number, PIN, and preferred call window
2. **Daily Calls**: Receive automated calls during your scheduled time
3. **Voice Logging**: When called, authenticate with your PIN and speak what you ate
4. **Dashboard**: View your calorie intake, trends, and history in real-time

## Project Structure

```
calorie-coach/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   └── signup/           # Signup page
├── components/            # React components
├── lib/                   # Utility libraries
│   └── supabase/         # Supabase clients
├── n8n/                   # n8n workflow definitions
├── supabase/             # Database schema
├── types/                # TypeScript types
└── docker-compose.yml    # Docker configuration
```

## API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/twilio/voice` - Handle incoming Twilio calls
- `POST /api/twilio/verify-pin` - Verify user PIN
- `POST /api/elevenlabs/webhook` - Process ElevenLabs conversation events

## Security Considerations

- All user data is protected with Row Level Security (RLS) in Supabase
- PIN-based authentication for voice calls
- HTTPS required for all webhooks
- Service role keys should never be exposed to the client

## Development Workflow

1. Make changes to the code
2. Test locally with `npm run dev`
3. Update n8n workflows if needed
4. Run tests (when implemented)
5. Deploy to production

## Deployment

The application can be deployed to:
- **Frontend**: Vercel (recommended for Next.js)
- **n8n**: Any Docker-capable host
- **Database**: Supabase managed instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open a GitHub issue.