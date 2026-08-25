import { http, HttpResponse } from 'msw';

const PINATA_API_URL = 'https://api.pinata.cloud';

// Mock successful file upload response
export const pinataSuccessHandler = http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
  return HttpResponse.json({
    IpfsHash: 'QmTestHash123456789',
    PinSize: 1024,
    Timestamp: new Date().toISOString(),
    isDuplicate: false,
  });
});

// Mock file pin status check
export const pinataPinStatusHandler = http.get(`${PINATA_API_URL}/pinning/pinJobs`, () => {
  return HttpResponse.json({
    rows: [
      {
        id: '1',
        ipfsHash: 'QmTestHash123456789',
        status: 'searching',
        name: 'test-file.pdf',
        date_pinned: new Date().toISOString(),
        date_unpinned: null,
        pinSize: 1024,
        user_id: '1',
        attempts: 1,
        noOfFiles: 1,
      },
    ],
    count: 1,
    pageIndex: 0,
  });
});

// Mock successful unpin response
export const pinataUnpinHandler = http.delete(`${PINATA_API_URL}/pinning/unpin/:hashToDelete`, () => {
  return HttpResponse.json({
    status: 'unpinned',
  });
});

// Mock gateway conversion
export const pinataGatewayHandler = http.post(`${PINATA_API_URL}/data/testAuthentication`, () => {
  return HttpResponse.json({
    authenticated: true,
  });
});

// Handler for failure scenarios (optional - used for error testing)
export const pinataFailureHandler = http.post(`${PINATA_API_URL}/pinning/pinFileToIPFS`, () => {
  return HttpResponse.json(
    {
      error: 'Invalid authentication',
      details: 'JWT token is invalid or expired',
    },
    { status: 401 }
  );
});

// Export all handlers as an array
export const pinataHandlers = [
  pinataSuccessHandler,
  pinataPinStatusHandler,
  pinataUnpinHandler,
  pinataGatewayHandler,
];
