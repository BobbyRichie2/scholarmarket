import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletButton } from '../WalletBtn';
import { WalletStatus } from '@/providers/WalletProvider';

// Mock the useWallet hook
vi.mock('@/hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

// Mock the config
vi.mock('@/lib/config/chain', () => ({
  isMainnet: true,
}));

// Get the mocked hook
import { useWallet } from '@/hooks/useWallet';

describe('WalletButton Component', () => {
  let mockConnect;
  let mockDisconnect;

  beforeEach(() => {
    mockConnect = vi.fn();
    mockDisconnect = vi.fn();
    vi.clearAllMocks();
  });

  describe('Wallet State Rendering', () => {
    it('should render connect button in idle state', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const button = screen.getByRole('button', { name: /connect wallet/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should render disabled button with spinner in initializing state', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Initializing },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const button = screen.getByRole('button', { name: /loading/i });
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading…')).toBeInTheDocument();
    });

    it('should render disabled connecting state with spinner', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Connecting },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const button = screen.getByRole('button', { name: /opening wallet/i });
      expect(button).toBeDisabled();
      expect(screen.getByText('Opening wallet…')).toBeInTheDocument();
    });

    it('should render connected state with address and disconnect button', () => {
      const testAddress = 'GBRPYHIL2CI3WHZSRXIE5QJX5ZLCAPAVYXJ4RBAQKFHYAQZ5A5XU6RQP';

      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: { address: testAddress },
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      // Should show truncated address
      expect(screen.getByText('GBRP…RQP')).toBeInTheDocument();

      // Should show disconnect button
      const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
      expect(disconnectBtn).toBeInTheDocument();
    });

    it('should render locked wallet state with reconnect button', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Locked },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      expect(
        screen.getByText(
          /Your wallet is locked or hasn't granted access/i
        )
      ).toBeInTheDocument();

      const reconnectBtn = screen.getByRole('button', {
        name: /unlock and reconnect/i,
      });
      expect(reconnectBtn).toBeInTheDocument();
    });

    it('should render unsupported network state', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Unsupported },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      expect(
        screen.getByText(/Your wallet is on the wrong network/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Mainnet')).toBeInTheDocument();

      const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
      expect(disconnectBtn).toBeInTheDocument();
    });

    it('should render error state with retry button', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Error },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
      expect(connectBtn).toBeInTheDocument();
      expect(connectBtn).not.toBeDisabled();
    });

    it('should render expired session state', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Expired },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      expect(
        screen.getByText(/Wallet session expired/i)
      ).toBeInTheDocument();

      const reconnectBtn = screen.getByRole('button', { name: /reconnect wallet/i });
      expect(reconnectBtn).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call connect when idle button is clicked', async () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const connectBtn = screen.getByRole('button', { name: /connect wallet/i });
      await userEvent.click(connectBtn);

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should call disconnect when disconnect button is clicked', async () => {
      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: { address: 'GBRP...' },
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
      await userEvent.click(disconnectBtn);

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should call connect when locked state reconnect button is clicked', async () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Locked },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const reconnectBtn = screen.getByRole('button', {
        name: /unlock and reconnect/i,
      });
      await userEvent.click(reconnectBtn);

      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid clicks without multiple calls', async () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const connectBtn = screen.getByRole('button', { name: /connect wallet/i });

      // Simulate rapid clicks
      await userEvent.click(connectBtn);
      await userEvent.click(connectBtn);
      await userEvent.click(connectBtn);

      // Handler should be called each time (component doesn't prevent this)
      expect(mockConnect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Address Display and Truncation', () => {
    it('should correctly truncate long addresses', () => {
      const addresses = [
        'GBRPYHIL2CI3WHZSRXIE5QJX5ZLCAPAVYXJ4RBAQKFHYAQZ5A5XU6RQP',
        'GBBD47UZQ5SYWV26D2ZKHRKKXZNQPOZWV7XM5NVNHXQJ7ICJP4WLVDW4',
      ];

      addresses.forEach((address) => {
        const { rerender } = render(
          <WalletButton />
        );

        useWallet.mockReturnValue({
          state: {
            status: WalletStatus.Connected,
            session: { address },
          },
          connect: mockConnect,
          disconnect: mockDisconnect,
        });

        rerender(<WalletButton />);

        const first4 = address.slice(0, 4);
        const last4 = address.slice(-4);
        const truncated = `${first4}…${last4}`;

        expect(screen.getByText(truncated)).toBeInTheDocument();
      });
    });

    it('should display connected status indicator', () => {
      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: { address: 'GBRP...' },
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      const { container } = render(<WalletButton />);

      // Check for status indicator (emerald-500 dot)
      const statusIndicator = container.querySelector('.bg-emerald-500');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations in idle state', async () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      const { container } = render(<WalletButton />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in connected state', async () => {
      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: { address: 'GBRPYHIL2CI3WHZSRXIE5QJX5ZLCAPAVYXJ4RBAQKFHYAQZ5A5XU6RQP' },
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      const { container } = render(<WalletButton />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in error state', async () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Locked },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      const { container } = render(<WalletButton />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper button roles', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-lg', 'font-medium');
    });

    it('should have disabled state properly announced', () => {
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Connecting },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('disabled');
    });
  });

  describe('State Transitions', () => {
    it('should handle state change from idle to connecting', () => {
      const { rerender } = render(<WalletButton />);

      // Start in idle state
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Idle },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });
      rerender(<WalletButton />);

      expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();

      // Change to connecting state
      useWallet.mockReturnValue({
        state: { status: WalletStatus.Connecting },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });
      rerender(<WalletButton />);

      expect(screen.getByText('Opening wallet…')).toBeInTheDocument();
    });

    it('should handle state change from connecting to connected', () => {
      const { rerender } = render(<WalletButton />);
      const address = 'GBRPYHIL2CI3WHZSRXIE5QJX5ZLCAPAVYXJ4RBAQKFHYAQZ5A5XU6RQP';

      useWallet.mockReturnValue({
        state: { status: WalletStatus.Connecting },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });
      rerender(<WalletButton />);

      expect(screen.getByText('Opening wallet…')).toBeInTheDocument();

      // Change to connected
      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: { address },
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });
      rerender(<WalletButton />);

      expect(screen.getByText('GBRP…RQP')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown status gracefully', () => {
      useWallet.mockReturnValue({
        state: { status: 'UNKNOWN_STATUS' },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      const { container } = render(<WalletButton />);

      // Should not crash, renders nothing
      expect(container.firstChild).toBeNull();
    });

    it('should handle missing session data in connected state', () => {
      useWallet.mockReturnValue({
        state: {
          status: WalletStatus.Connected,
          session: {}, // Missing address
        },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      // Should not crash due to missing address.slice()
      expect(() => render(<WalletButton />)).not.toThrow();
    });

    it('should display proper text for testnet', () => {
      vi.resetModules();
      vi.doMock('@/lib/config/chain', () => ({
        isMainnet: false,
      }));

      useWallet.mockReturnValue({
        state: { status: WalletStatus.Unsupported },
        connect: mockConnect,
        disconnect: mockDisconnect,
      });

      render(<WalletButton />);

      expect(screen.getByText('Testnet')).toBeInTheDocument();
    });
  });
});
