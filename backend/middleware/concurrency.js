const express = require('express');

class ConcurrencyManager {
  constructor(maxConcurrent = 500) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.queue = [];
    this.metrics = {
      totalRequests: 0,
      completedRequests: 0,
      avgWaitTime: 0,
      peakConcurrency: 0
    };
  }

  async processRequest() {
    this.activeRequests++;
    this.metrics.totalRequests++;
    
    if (this.activeRequests > this.metrics.peakConcurrency) {
      this.metrics.peakConcurrency = this.activeRequests;
    }

    return new Promise((resolve) => {
      if (this.activeRequests <= this.maxConcurrent) {
        resolve();
      } else {
        const waitStartTime = Date.now();
        this.queue.push(() => {
          const waitTime = Date.now() - waitStartTime;
          this.metrics.avgWaitTime = 
            (this.metrics.avgWaitTime * (this.metrics.completedRequests - 1) + waitTime) / 
            this.metrics.completedRequests;
          resolve();
        });
      }
    });
  }

  releaseRequest() {
    this.activeRequests--;
    this.metrics.completedRequests++;

    if (this.queue.length > 0) {
      const nextRequest = this.queue.shift();
      nextRequest();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length
    };
  }
}

const manager = new ConcurrencyManager(500);

const concurrencyMiddleware = async (req, res, next) => {
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      manager.releaseRequest();
    }
  };

  try {
    await manager.processRequest();
    
    res.on('finish', release);
    res.on('close', release);

    next();
  } catch (err) {
    release();
    res.status(503).json({
      success: false,
      message: 'Server at capacity. Please try again.'
    });
  }
};

const getMetricsEndpoint = (req, res) => {
  res.json({
    success: true,
    metrics: manager.getMetrics()
  });
};

module.exports = {
  concurrencyMiddleware,
  getMetricsEndpoint,
  manager
};
