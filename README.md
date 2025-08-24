# Zwift Racing Insights

A sophisticated dashboard for analyzing ZwiftPower racing data with objective power profiling and performance insights.

## Features

- **Objective Power Analysis**: Scientific power profiling using Coggan methodology
- **Critical Power Modeling**: VO2max estimation and power curve analysis  
- **Performance Timeline**: Historical racing progression with power trends
- **ZwiftPower Categories**: Accurate categorization with W/kg precision
- **Event Type Analysis**: Specialized views for different race formats
- **Responsive Design**: Mobile-friendly interface with modern UI

## Deployment Architecture

This application is designed for **Netlify deployment with Functions**:

- **Frontend**: React + Vite SPA served statically
- **Backend**: Netlify Functions for dynamic rider data fetching
- **Data Storage**: JSON files in `/public/data/riders/`
- **API Endpoints**: `/api/*` routes handled by Functions

## Quick Start

### Deploy to Netlify (Recommended)

1. **Fork this repository** to your GitHub account
2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose your forked repository
   - Deploy settings are auto-detected from `netlify.toml`
3. **Enable Functions**:
   - Functions are automatically enabled with this configuration
   - No additional setup required

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## API Endpoints

### `GET /api/health`
Health check endpoint

### `POST /api/fetch-rider`
```json
{
  "riderId": "5528916",
  "force_refresh": false
}
```

### `GET /api/riders`
List all available riders with data

## Data Structure

```
public/data/riders/{riderId}/
├── profile.json      # Basic rider information
├── power.json        # Power data and zones
├── races.json        # Race history
├── workouts.json     # Training data
├── events_summary.json # Event statistics
└── ...
```

## Configuration

### Environment Variables (Future)
- `ZWIFT_USERNAME` - ZwiftPower credentials
- `ZWIFT_PASSWORD` - ZwiftPower credentials  
- `API_RATE_LIMIT` - Request rate limiting

### Build Settings
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Functions Directory**: `netlify/functions`
- **Node Version**: 18+

## Development Notes

### Adding New Riders
Currently requires manual data collection. Future versions will support:
- Automatic rider data fetching via API
- Background data refresh
- Real-time power analysis

### Scientific Accuracy
All calculations based on:
- Coggan Power Training Zones
- Critical Power modeling
- VO2max estimation algorithms
- ZwiftPower categorization rules

## Technical Stack

- **Frontend**: React 18, Vite, TailwindCSS, Recharts
- **Backend**: Netlify Functions, Node.js 18+
- **Deployment**: Netlify with continuous deployment
- **Data**: Static JSON files with API caching

## Sample Data

Includes complete dataset for rider `5528916` demonstrating all features:
- 100+ race results
- Power profiling data
- Training history
- Performance trends

## License

MIT License - see LICENSE file for details.

---

*Built for the cycling community with scientific precision and modern web technology.*
