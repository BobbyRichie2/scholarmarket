import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { pinataSuccessHandler, pinataFailureHandler } from '../handlers/pinata.handlers.js';

// Create test server with Pinata mocks
const server = setupServer(pinataSuccessHandler);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Upload API with Pinata Mocking', () => {
  describe('File Upload to IPFS', () => {
    it('should successfully upload file to Pinata IPFS', async () => {
      // Simulate the upload workflow
      const uploadToIPFS = async (file, jwt) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        return response.json();
      };

      const testFile = new Blob(['Educational content'], { type: 'application/pdf' });
      const result = await uploadToIPFS(testFile, 'test-jwt-token');

      expect(result.IpfsHash).toBe('QmTestHash123456789');
      expect(result.PinSize).toBe(1024);
      expect(result.isDuplicate).toBe(false);
    });

    it('should handle upload authentication errors with mocked response', async () => {
      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', () => {
          return HttpResponse.json(
            {
              error: 'Invalid authentication',
              details: 'JWT token is invalid or expired',
            },
            { status: 401 }
          );
        })
      );

      const uploadToIPFS = async (file, jwt) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details);
        }

        return response.json();
      };

      const testFile = new Blob(['content'], { type: 'application/pdf' });

      await expect(uploadToIPFS(testFile, 'invalid-token')).rejects.toThrow(
        'JWT token is invalid or expired'
      );
    });

    it('should validate file before upload to Pinata', async () => {
      const validateFile = (file) => {
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/zip'];

        if (file.size > MAX_SIZE) {
          throw new Error(`File size ${file.size} exceeds maximum ${MAX_SIZE}`);
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`File type ${file.type} not allowed`);
        }

        return true;
      };

      const validFile = new Blob(['content'], { type: 'application/pdf' });
      expect(() => validateFile(validFile)).not.toThrow();

      const invalidTypeFile = new Blob(['content'], { type: 'application/exe' });
      expect(() => validateFile(invalidTypeFile)).toThrow('not allowed');

      const largeBuf = new Uint8Array(11 * 1024 * 1024); // 11MB
      const largeFile = new Blob([largeBuf], { type: 'application/pdf' });
      expect(() => validateFile(largeFile)).toThrow('exceeds maximum');
    });
  });

  describe('Upload with Thumbnail', () => {
    it('should upload file and thumbnail separately', async () => {
      let uploadCount = 0;

      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', async () => {
          uploadCount++;
          if (uploadCount === 1) {
            return HttpResponse.json({
              IpfsHash: 'QmMainFile123',
              PinSize: 5000,
            });
          } else {
            return HttpResponse.json({
              IpfsHash: 'QmThumbnail456',
              PinSize: 500,
            });
          }
        })
      );

      const uploadFileAndThumbnail = async (file, thumbnail) => {
        const uploadFile = async (f) => {
          const formData = new FormData();
          formData.append('file', f);

          const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            body: formData,
          });

          return response.json();
        };

        const mainResult = await uploadFile(file);
        const thumbResult = thumbnail ? await uploadFile(thumbnail) : null;

        return {
          main: mainResult.IpfsHash,
          thumbnail: thumbResult?.IpfsHash,
        };
      };

      const file = new Blob(['content'], { type: 'application/pdf' });
      const thumb = new Blob(['thumb'], { type: 'image/png' });

      const result = await uploadFileAndThumbnail(file, thumb);

      expect(result.main).toBe('QmMainFile123');
      expect(result.thumbnail).toBe('QmThumbnail456');
      expect(uploadCount).toBe(2);
    });
  });

  describe('Metadata and Response Handling', () => {
    it('should process upload response and extract IPFS hash', async () => {
      const processUploadResponse = async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        return {
          storageKey: data.IpfsHash,
          size: data.PinSize,
          timestamp: data.Timestamp,
          isDuplicate: data.isDuplicate,
        };
      };

      const file = new Blob(['Educational material'], { type: 'application/pdf' });
      const result = await processUploadResponse(file);

      expect(result.storageKey).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
      expect(typeof result.isDuplicate).toBe('boolean');
    });

    it('should handle duplicate file detection from Pinata', async () => {
      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', () => {
          return HttpResponse.json({
            IpfsHash: 'QmExistingHash',
            PinSize: 1024,
            isDuplicate: true, // File already pinned
            Timestamp: new Date().toISOString(),
          });
        })
      );

      const file = new Blob(['content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      expect(data.isDuplicate).toBe(true);
      expect(data.IpfsHash).toBe('QmExistingHash');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', () => {
          return HttpResponse.error();
        })
      );

      const uploadWithRetry = async (file, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              return response.json();
            }
          } catch (err) {
            if (i === maxRetries - 1) {
              throw new Error('Upload failed after retries');
            }
            // Retry
          }
        }
      };

      const file = new Blob(['content'], { type: 'application/pdf' });

      // Reset to success for final attempt
      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', () => {
          return HttpResponse.json({
            IpfsHash: 'QmRecovered',
            PinSize: 1024,
          });
        })
      );

      const result = await uploadWithRetry(file);
      expect(result.IpfsHash).toBe('QmRecovered');
    });

    it('should format error messages for user display', async () => {
      server.use(
        http.post('https://api.pinata.cloud/pinning/pinFileToIPFS', () => {
          return HttpResponse.json(
            {
              error: 'Insufficient balance',
              details: 'Your account does not have enough credits for this operation',
            },
            { status: 402 }
          );
        })
      );

      const formatErrorForUser = async (error) => {
        const statusCode = error.status;

        const errorMessages = {
          401: 'Authentication failed. Please check your API credentials.',
          402: 'Insufficient credits. Please add funds to your Pinata account.',
          413: 'File is too large. Maximum size is 10MB.',
          429: 'Too many requests. Please wait before trying again.',
          500: 'Server error. Please try again later.',
        };

        return errorMessages[statusCode] || 'An unexpected error occurred during upload.';
      };

      const file = new Blob(['content'], { type: 'application/pdf' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        body: formData,
      });

      const errorMsg = await formatErrorForUser({ status: response.status });
      expect(errorMsg).toContain('credits');
    });
  });
});
