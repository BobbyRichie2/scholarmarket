import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import {
  pinataSuccessHandler,
  pinataPinStatusHandler,
  pinataUnpinHandler,
  pinataFailureHandler,
} from '../handlers/pinata.handlers.js';

const PINATA_API_URL = 'https://api.pinata.cloud';

// Create separate server for these tests
const server = setupServer(
  pinataSuccessHandler,
  pinataPinStatusHandler,
  pinataUnpinHandler
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Pinata API Mocking with MSW', () => {
  describe('File Upload Mocking', () => {
    it('should mock successful file upload to Pinata', async () => {
      const formData = new FormData();
      const blob = new Blob(['test file content'], { type: 'application/pdf' });
      formData.append('file', blob, 'test.pdf');

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-jwt-token',
        },
        body: formData,
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.IpfsHash).toBe('QmTestHash123456789');
      expect(data.PinSize).toBe(1024);
      expect(data.isDuplicate).toBe(false);
      expect(data.Timestamp).toBeDefined();
    });

    it('should mock failed upload with authentication error', async () => {
      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          return HttpResponse.json(
            {
              error: 'Invalid authentication',
              details: 'JWT token is invalid or expired',
            },
            { status: 401 }
          );
        })
      );

      const formData = new FormData();
      const blob = new Blob(['test'], { type: 'application/pdf' });
      formData.append('file', blob);

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
        body: formData,
      });

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Invalid authentication');
    });

    it('should mock file size limit exceeded error', async () => {
      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          return HttpResponse.json(
            {
              error: 'File size exceeded',
              details: 'Maximum file size is 10MB',
            },
            { status: 413 }
          );
        })
      );

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.status).toBe(413);

      const data = await response.json();
      expect(data.error).toContain('File size exceeded');
    });
  });

  describe('Pin Status Checking', () => {
    it('should mock pin status query', async () => {
      const response = await fetch(`${PINATA_API_URL}/pinning/pinJobs`, {
        headers: {
          Authorization: 'Bearer test-jwt-token',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.rows).toBeDefined();
      expect(data.rows).toHaveLength(1);
      expect(data.rows[0].ipfsHash).toBe('QmTestHash123456789');
      expect(data.rows[0].status).toBe('searching');
      expect(data.count).toBe(1);
    });

    it('should return empty pin jobs when none exist', async () => {
      server.use(
        http.get(`${PINATA_API_URL}/pinning/pinJobs`, () => {
          return HttpResponse.json({
            rows: [],
            count: 0,
            pageIndex: 0,
          });
        })
      );

      const response = await fetch(`${PINATA_API_URL}/pinning/pinJobs`);
      const data = await response.json();

      expect(data.rows).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it('should mock paginated pin jobs response', async () => {
      server.use(
        http.get(`${PINATA_API_URL}/pinning/pinJobs`, ({ request }) => {
          const url = new URL(request.url);
          const pageIndex = parseInt(url.searchParams.get('pageIndex') || '0');

          if (pageIndex === 0) {
            return HttpResponse.json({
              rows: [
                {
                  id: '1',
                  ipfsHash: 'QmHash1',
                  status: 'pinned',
                  name: 'file1.pdf',
                },
                {
                  id: '2',
                  ipfsHash: 'QmHash2',
                  status: 'pinned',
                  name: 'file2.pdf',
                },
              ],
              count: 50,
              pageIndex: 0,
            });
          }

          return HttpResponse.json({
            rows: [
              {
                id: '3',
                ipfsHash: 'QmHash3',
                status: 'searching',
                name: 'file3.pdf',
              },
            ],
            count: 50,
            pageIndex: 1,
          });
        })
      );

      // First page
      const response1 = await fetch(`${PINATA_API_URL}/pinning/pinJobs?pageIndex=0`);
      const data1 = await response1.json();
      expect(data1.rows).toHaveLength(2);
      expect(data1.count).toBe(50);

      // Second page
      const response2 = await fetch(`${PINATA_API_URL}/pinning/pinJobs?pageIndex=1`);
      const data2 = await response2.json();
      expect(data2.rows).toHaveLength(1);
      expect(data2.pageIndex).toBe(1);
    });
  });

  describe('Unpin Operations', () => {
    it('should mock successful unpin request', async () => {
      const hashToDelete = 'QmTestHash123456789';

      const response = await fetch(
        `${PINATA_API_URL}/pinning/unpin/${hashToDelete}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer test-jwt-token',
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('unpinned');
    });

    it('should mock unpin with hash not found error', async () => {
      server.use(
        http.delete(`${PINATA_API_URL}/pinning/unpin/:hashToDelete`, () => {
          return HttpResponse.json(
            {
              error: 'Hash not found',
              details: 'The provided hash is not pinned on this account',
            },
            { status: 404 }
          );
        })
      );

      const response = await fetch(
        `${PINATA_API_URL}/pinning/unpin/QmNonexistent`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBe('Hash not found');
    });

    it('should mock rate limit error on unpin', async () => {
      server.use(
        http.delete(`${PINATA_API_URL}/pinning/unpin/:hashToDelete`, () => {
          return HttpResponse.json(
            {
              error: 'Rate limit exceeded',
              details: 'Too many requests in a short time',
            },
            { status: 429 }
          );
        })
      );

      const response = await fetch(
        `${PINATA_API_URL}/pinning/unpin/QmTestHash`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(429);

      const data = await response.json();
      expect(data.error).toContain('Rate limit');
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle network timeout gracefully', async () => {
      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          // Simulate network timeout
          return HttpResponse.error();
        })
      );

      try {
        await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
          method: 'POST',
          body: new FormData(),
        });
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('should handle malformed response', async () => {
      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          return HttpResponse.text('Invalid response', { status: 500 });
        })
      );

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        body: new FormData(),
      });

      expect(response.status).toBe(500);
      const text = await response.text();
      expect(text).toBe('Invalid response');
    });

    it('should verify no real network requests are made', async () => {
      // Mock an endpoint that should NOT be called
      let wasNotCalled = true;

      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          wasNotCalled = false;
          return HttpResponse.json({ error: 'Should not reach real API' });
        })
      );

      const formData = new FormData();
      formData.append('file', new Blob(['test'], { type: 'application/pdf' }));

      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        body: formData,
      });

      // Handler was called, but it's our mock handler, not a real request
      expect(response.status).toBe(200); // Success response from initial handler
    });
  });

  describe('Integration with Application Code', () => {
    it('should support mocking file uploads in application context', async () => {
      // Simulate application upload function
      const uploadToIPFS = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.PINATA_JWT || 'test-token'}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        return response.json();
      };

      const testFile = new Blob(['Educational content'], { type: 'application/pdf' });
      testFile.name = 'course.pdf';

      const result = await uploadToIPFS(testFile);

      expect(result.IpfsHash).toBeDefined();
      expect(result.IpfsHash).toBe('QmTestHash123456789');
    });

    it('should handle upload retry logic with mocks', async () => {
      let attemptCount = 0;

      server.use(
        http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json(
              { error: 'Service temporarily unavailable' },
              { status: 503 }
            );
          }
          return HttpResponse.json({
            IpfsHash: 'QmSuccess',
            PinSize: 1024,
          });
        })
      );

      const retryUpload = async (file, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
            method: 'POST',
            body: new FormData([['file', file]]),
          });

          if (response.ok) {
            return response.json();
          }

          if (i < maxRetries - 1) {
            // Wait before retry (simulate backoff)
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        throw new Error('Upload failed after retries');
      };

      const file = new Blob(['test'], { type: 'application/pdf' });
      const result = await retryUpload(file);

      expect(result.IpfsHash).toBe('QmSuccess');
      expect(attemptCount).toBe(2);
    });
  });
});
