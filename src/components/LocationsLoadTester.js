import React, { useCallback } from 'react';
import { Card, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { useLoadTester } from '../contexts/LoadTesterContext';

export const LocationsLoadTester = () => {
  const { 
    isRunning, 
    metrics, 
    queriesPerMinute, 
    setQueriesPerMinute, 
    startTest, 
    stopTest 
  } = useLoadTester();

  const formatDuration = useCallback((startTime) => {
    if (!startTime) return '0:00';
    const diff = Math.floor((new Date() - startTime) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const formatTime = useCallback((ms) => {
    if (!isFinite(ms)) return '-';
    return `${ms.toFixed(2)}ms`;
  }, []);

  return (
    <Card className="mb-4">
      <Card.Header>
        <h5 className="mb-0">Locations Load Tester</h5>
      </Card.Header>
      <Card.Body>
        <Row className="align-items-center mb-3">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label>Queries per Minute</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="1000"
                value={queriesPerMinute}
                onChange={(e) => setQueriesPerMinute(Number(e.target.value))}
                disabled={isRunning}
              />
            </Form.Group>
          </Col>
          <Col xs={12} md={6} className="mt-3 mt-md-0">
            <Button
              variant={isRunning ? 'danger' : 'primary'}
              onClick={isRunning ? stopTest : startTest}
              className="w-100"
            >
              {isRunning ? 'Stop Test' : 'Start Test'}
            </Button>
          </Col>
        </Row>

        <Row className="g-3">
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Total Queries:</span>
              <Badge bg="primary">{metrics.totalQueries}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Current Locations:</span>
              <Badge bg="info">{metrics.totalLocations}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Duration:</span>
              <Badge bg="secondary">{formatDuration(metrics.startTime)}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Avg Response:</span>
              <Badge bg="success">{formatTime(metrics.averageResponseTime)}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Min Response:</span>
              <Badge bg="success">{formatTime(metrics.minResponseTime)}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Max Response:</span>
              <Badge bg="warning">{formatTime(metrics.maxResponseTime)}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Success Rate:</span>
              <Badge bg="success">
                {metrics.totalQueries ? 
                  ((metrics.successCount / metrics.totalQueries) * 100).toFixed(2) + '%' 
                  : '-'}
              </Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Errors:</span>
              <Badge bg="danger">{metrics.errorCount}</Badge>
            </div>
          </Col>
          <Col xs={12} md={4}>
            <div className="d-flex justify-content-between align-items-center border rounded p-2">
              <span>Last Query:</span>
              <Badge bg="info">
                {metrics.lastQueryTime ? 
                  new Date(metrics.lastQueryTime).toLocaleTimeString() 
                  : '-'}
              </Badge>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};
