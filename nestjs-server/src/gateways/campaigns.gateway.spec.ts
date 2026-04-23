import { CampaignsGateway } from './campaigns.gateway';

const mockSocket = (id = 'socket-1') => ({
  id,
  join: jest.fn(),
  leave: jest.fn(),
});

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

describe('CampaignsGateway', () => {
  let gateway: CampaignsGateway;

  beforeEach(() => {
    gateway = new CampaignsGateway();
    (gateway as any).server = mockServer;
    jest.clearAllMocks();
    mockServer.to.mockReturnThis();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection / handleDisconnect', () => {
    it('should log connection and disconnection', () => {
      const client = mockSocket('c1') as any;
      expect(() => gateway.handleConnection(client)).not.toThrow();
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('handleJoinCampaign', () => {
    it('should add client to room and broadcast viewer count', () => {
      const client = mockSocket('c1') as any;
      gateway.handleJoinCampaign('42', client);

      expect(client.join).toHaveBeenCalledWith('campaign:42');
      expect(mockServer.to).toHaveBeenCalledWith('campaign:42');
      expect(mockServer.emit).toHaveBeenCalledWith('viewer_count', { count: 1 });
    });

    it('should increment viewer count for multiple clients', () => {
      const c1 = mockSocket('c1') as any;
      const c2 = mockSocket('c2') as any;
      gateway.handleJoinCampaign('42', c1);
      jest.clearAllMocks();
      mockServer.to.mockReturnThis();
      gateway.handleJoinCampaign('42', c2);

      expect(mockServer.emit).toHaveBeenCalledWith('viewer_count', { count: 2 });
    });
  });

  describe('handleLeaveCampaign', () => {
    it('should remove client from room and update viewer count', () => {
      const client = mockSocket('c1') as any;
      gateway.handleJoinCampaign('42', client);
      jest.clearAllMocks();
      mockServer.to.mockReturnThis();

      gateway.handleLeaveCampaign('42', client);

      expect(client.leave).toHaveBeenCalledWith('campaign:42');
      expect(mockServer.emit).toHaveBeenCalledWith('viewer_count', { count: 0 });
    });
  });

  describe('broadcastNewDonation', () => {
    it('should emit new_donation to the campaign room', () => {
      const donation = { amount: 100, donorName: 'Ahmed', isAnonymous: false, message: 'For the cause' };
      gateway.broadcastNewDonation('42', donation);

      expect(mockServer.to).toHaveBeenCalledWith('campaign:42');
      expect(mockServer.emit).toHaveBeenCalledWith('new_donation', expect.objectContaining({
        amount: 100,
        donorName: 'Ahmed',
        message: 'For the cause',
      }));
    });

    it('should use "Anonymous" when donation is anonymous', () => {
      const donation = { amount: 50, donorName: 'Secret', isAnonymous: true, message: null };
      gateway.broadcastNewDonation('42', donation);

      expect(mockServer.emit).toHaveBeenCalledWith('new_donation', expect.objectContaining({
        donorName: 'Anonymous',
      }));
    });
  });

  describe('broadcastProgressUpdate', () => {
    it('should emit progress_update with percentage to the campaign room', () => {
      const campaign = { currentAmount: 25000, goalAmount: 50000, status: 'active' };
      gateway.broadcastProgressUpdate('42', campaign);

      expect(mockServer.to).toHaveBeenCalledWith('campaign:42');
      expect(mockServer.emit).toHaveBeenCalledWith('progress_update', {
        currentAmount: 25000,
        goalAmount: 50000,
        percentage: 50,
        status: 'active',
      });
    });
  });

  describe('handleDisconnect (cleans up rooms)', () => {
    it('should remove client from all campaign rooms on disconnect', () => {
      const client = mockSocket('c1') as any;
      gateway.handleJoinCampaign('42', client);
      gateway.handleJoinCampaign('99', client);
      jest.clearAllMocks();
      mockServer.to.mockReturnThis();

      gateway.handleDisconnect(client);

      expect(mockServer.emit).toHaveBeenCalledWith('viewer_count', expect.objectContaining({ count: 0 }));
    });
  });
});
