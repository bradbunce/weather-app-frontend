import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';

const WeatherCard = ({ location, onRemove }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWeatherData();
  }, [location]);

  const fetchWeatherData = async () => {
    try {
      // This will be replaced with actual API call to Lambda
      // const response = await axios.get(`YOUR_LAMBDA_API_ENDPOINT/weather/${location.name}`);
      // setWeather(response.data);
      
      // Temporary mock weather data
      setWeather({
        temperature: Math.floor(Math.random() * 30) + 10, // Random temp between 10-40°C
        condition: 'Sunny',
        humidity: Math.floor(Math.random() * 40) + 30, // Random humidity between 30-70%
        windSpeed: Math.floor(Math.random() * 20) + 5 // Random wind speed between 5-25 km/h
      });
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch weather data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-100">
        <Card.Body>
          <Card.Title>{location.name}</Card.Title>
          <div className="text-danger">{error}</div>
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={onRemove}
            className="mt-2"
          >
            Remove
          </Button>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-start">
          {location.name}
          <Button 
            variant="outline-danger" 
            size="sm" 
            onClick={onRemove}
          >
            Remove
          </Button>
        </Card.Title>
        <Card.Text>
          <div className="mb-2">
            <strong>Temperature:</strong> {weather.temperature}°C
          </div>
          <div className="mb-2">
            <strong>Condition:</strong> {weather.condition}
          </div>
          <div className="mb-2">
            <strong>Humidity:</strong> {weather.humidity}%
          </div>
          <div>
            <strong>Wind Speed:</strong> {weather.windSpeed} km/h
          </div>
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default WeatherCard;