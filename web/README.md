# NexSupply - B2B Sourcing Platform

AI-powered B2B sourcing intelligence platform that provides cost analysis, supplier verification, and market insights for global sourcing decisions.

## Features

- 🤖 **AI-Powered Analysis**: Gemini 2.5 Flash for intelligent sourcing insights
- 💰 **Landed Cost Calculator**: Accurate cost breakdown with hidden cost alerts
- ✅ **Supplier Verification**: Verified supplier database with risk assessment
- 📊 **Market Snapshot**: Real-time market demand and competition analysis
- ⏱️ **Lead Time Planning**: Production and shipping timeline estimates
- 🌐 **Multi-language Support**: English, Chinese, Spanish, Hindi, Arabic, Korean, Japanese

## Tech Stack

- **Framework**: Streamlit
- **AI Model**: Google Gemini 2.5 Flash
- **Database**: SQLite (local analytics)
- **Visualization**: Plotly
- **Email**: SMTP (Gmail)

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexsupply-platform
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   - Copy `.streamlit/secrets.toml.example` to `.streamlit/secrets.toml`
   - Add your `GEMINI_API_KEY` and SMTP credentials

4. **Run the app**
   ```bash
   streamlit run streamlit_app.py
   ```

## Deployment

### Streamlit Cloud

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Streamlit Cloud**
   - Go to [share.streamlit.io](https://share.streamlit.io)
   - Connect your GitHub repository
   - Add secrets in Streamlit Cloud dashboard:
     - `GEMINI_API_KEY`
     - `SMTP_SERVER` (optional)
     - `SMTP_PORT` (optional, default: 465)
     - `SMTP_USERNAME` (optional)
     - `SMTP_PASSWORD` (optional)

3. **Mobile Access**
   - Streamlit apps are mobile-responsive
   - Access via mobile browser at your Streamlit Cloud URL
   - No additional mobile app needed

### Environment Variables (Streamlit Cloud)

In Streamlit Cloud, add these secrets:

```
GEMINI_API_KEY=your-api-key-here
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
```

## Project Structure

```
nexsupply-platform/
├── pages/              # Streamlit pages
│   ├── home.py        # Landing page
│   ├── results_dashboard.py  # Results page
│   └── analytics.py   # Analytics dashboard
├── services/          # Business logic
│   ├── gemini_service.py  # AI service
│   ├── email_service.py   # Email service
│   └── data_logger.py     # Analytics
├── components/         # Reusable components
│   └── supplier_card.py
├── utils/              # Utilities
│   ├── config.py      # Configuration
│   ├── prompts.py     # AI prompts
│   └── cost_calculator.py
├── state/              # Session state
└── streamlit_app.py   # Main entry point
```

## Security

- ✅ API keys stored in environment variables/secrets
- ✅ No hardcoded credentials
- ✅ Error handling with generic error codes
- ✅ Database files excluded from Git

## License

© 2017 NexSupply. All rights reserved.

