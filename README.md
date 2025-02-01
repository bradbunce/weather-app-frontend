# Weather Dashboard Application

A modern, real-time weather tracking application built with React that allows users to monitor weather conditions for multiple cities simultaneously.

## Features

- **Real-time Weather Updates**: Live weather data via WebSocket connections for instant updates
- **Multiple Location Tracking**: Add and monitor weather for multiple cities
- **User Authentication**: Secure user accounts with features including:
  - Login/Register
  - Password reset functionality
  - Protected dashboard access
- **Detailed Weather Information**: For each location, view:
  - Temperature (°F)
  - Weather conditions
  - Humidity levels
  - Wind speed
- **Customization Options**:
  - Theme customization support
  - Font size adjustments
- **Responsive Design**: Works seamlessly across desktop and mobile devices

## Technical Features

- Built with React and React Bootstrap
- Real-time updates using WebSocket connections
- Geocoding integration for accurate location data
- Context-based state management
- Comprehensive error handling and loading states
- Development debugging tools
- LaunchDarkly Integration:
  - Feature flag management
  - SDK log level control (error, warn, info, debug)
  - Real-time log level updates

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser

## Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App

## Environment Variables

The application requires the following environment variables:
- Create a `.env` file based on `.env.example`
- Required variables:
  - `REACT_APP_LD_CLIENTSIDE_ID`: LaunchDarkly client-side ID
  - `REACT_APP_LD_SDK_LOG_FLAG_KEY`: Feature flag key for SDK log level control
  - Additional variables as specified in `.env.example`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
